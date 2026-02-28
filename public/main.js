// src/client/main.ts
var viewport = document.getElementById("viewport");
var canvas = document.getElementById("canvas");
var scale = 1;
var translateX = 0;
var translateY = 0;
var isPanning = false;
var lastX = 0;
var lastY = 0;
function updateTransform() {
  canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  viewport.style.backgroundPosition = `${translateX}px ${translateY}px`;
}
viewport.addEventListener("mousedown", (e) => {
  if (e.button === 0 && !e.target.closest(".artifact-card")) {
    isPanning = true;
    lastX = e.clientX;
    lastY = e.clientY;
    viewport.style.cursor = "grabbing";
  }
});
window.addEventListener("mousemove", (e) => {
  if (isPanning) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    translateX += dx;
    translateY += dy;
    lastX = e.clientX;
    lastY = e.clientY;
    updateTransform();
  }
});
window.addEventListener("mouseup", () => {
  isPanning = false;
  viewport.style.cursor = "grab";
});
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const oldScale = scale;
  const delta = e.deltaY;
  const zoomFactor = Math.pow(1.1, -delta / 100);
  scale *= zoomFactor;
  scale = Math.min(Math.max(scale, 0.05), 5);
  const actualZoom = scale / oldScale;
  translateX = mouseX - (mouseX - translateX) * actualZoom;
  translateY = mouseY - (mouseY - translateY) * actualZoom;
  updateTransform();
}, { passive: false });
var currentArtifacts = [];
var dragSourceFilename = null;
var cardMap = new Map;
function createCard(filename, index) {
  const isExternal = filename.startsWith("http://") || filename.startsWith("https://");
  const url = isExternal ? filename : `/${filename}`;
  const card = document.createElement("div");
  card.className = "artifact-card";
  card.setAttribute("draggable", "true");
  card.dataset.filename = filename;
  card.innerHTML = `
        <div class="artifact-header">
            <span>${filename}</span>
            <a href="${url}" target="_blank">↗</a>
        </div>
        <div class="iframe-container">
            <iframe class="artifact-iframe" src="${url}"></iframe>
        </div>
    `;
  card.addEventListener("dragstart", (e) => {
    dragSourceFilename = filename;
    card.classList.add("dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", filename);
    }
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    document.querySelectorAll(".artifact-card").forEach((c) => c.classList.remove("drag-over"));
    dragSourceFilename = null;
  });
  card.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (dragSourceFilename !== null && dragSourceFilename !== filename) {
      card.classList.add("drag-over");
    }
    return false;
  });
  card.addEventListener("dragleave", () => {
    card.classList.remove("drag-over");
  });
  card.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSourceFilename !== null && dragSourceFilename !== filename) {
      const sourceIdx = currentArtifacts.indexOf(dragSourceFilename);
      const targetIdx = currentArtifacts.indexOf(filename);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const temp = currentArtifacts[sourceIdx];
        currentArtifacts[sourceIdx] = currentArtifacts[targetIdx];
        currentArtifacts[targetIdx] = temp;
        renderArtifacts();
        updateConfigOnServer({ pages: currentArtifacts });
      }
    }
    return false;
  });
  return card;
}
var deviceToggle = document.getElementById("device-toggle");
function updateGrid() {
  const cols = Math.ceil(Math.sqrt(currentArtifacts.length));
  const cardWidth = getComputedStyle(document.body).getPropertyValue("--card-width").trim();
  canvas.style.gridTemplateColumns = `repeat(${cols}, ${cardWidth})`;
}
async function updateConfigOnServer(newConfig) {
  try {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig)
    });
  } catch (error) {
    console.error("Failed to update config on server:", error);
  }
}
deviceToggle.addEventListener("change", () => {
  const isMobile = deviceToggle.checked;
  document.body.classList.toggle("mobile-mode", isMobile);
  updateGrid();
  updateConfigOnServer({ device: isMobile ? "mobile" : "desktop" });
});
function renderArtifacts() {
  updateGrid();
  for (const [filename, card] of cardMap.entries()) {
    if (!currentArtifacts.includes(filename)) {
      card.remove();
      cardMap.delete(filename);
    }
  }
  currentArtifacts.forEach((filename, index) => {
    let card = cardMap.get(filename);
    if (!card) {
      card = createCard(filename, index);
      cardMap.set(filename, card);
      canvas.appendChild(card);
    }
    card.style.order = index.toString();
  });
}
async function syncConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    const isMobile = config.device === "mobile";
    if (deviceToggle.checked !== isMobile) {
      deviceToggle.checked = isMobile;
      document.body.classList.toggle("mobile-mode", isMobile);
      updateGrid();
    }
    if (JSON.stringify(config.pages) !== JSON.stringify(currentArtifacts)) {
      currentArtifacts = config.pages || [];
      renderArtifacts();
    }
  } catch (error) {
    console.error("Failed to sync config:", error);
  }
}
async function init() {
  updateTransform();
  await syncConfig();
  setInterval(syncConfig, 2000);
}
init();
