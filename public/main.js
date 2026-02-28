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
  const zoomFactor = 1.1;
  const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const oldScale = scale;
  scale *= direction;
  scale = Math.min(Math.max(scale, 0.05), 5);
  const actualDirection = scale / oldScale;
  translateX = mouseX - (mouseX - translateX) * actualDirection;
  translateY = mouseY - (mouseY - translateY) * actualDirection;
  updateTransform();
}, { passive: false });
var currentArtifacts = [];
var dragSourceFilename = null;
var cardMap = new Map;
function createCard(filename, index) {
  const card = document.createElement("div");
  card.className = "artifact-card";
  card.setAttribute("draggable", "true");
  card.dataset.filename = filename;
  card.innerHTML = `
        <div class="artifact-header">
            <span>${filename}</span>
            <a href="/${filename}" target="_blank">↗</a>
        </div>
        <div class="iframe-container">
            <iframe class="artifact-iframe" src="/${filename}"></iframe>
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
deviceToggle.addEventListener("change", () => {
  if (deviceToggle.checked) {
    document.body.classList.add("mobile-mode");
  } else {
    document.body.classList.remove("mobile-mode");
  }
  updateGrid();
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
async function fetchArtifacts() {
  try {
    const response = await fetch("/api/artifacts");
    const artifacts = await response.json();
    const sortedNew = [...artifacts].sort();
    const sortedCurrent = [...currentArtifacts].sort();
    if (JSON.stringify(sortedNew) !== JSON.stringify(sortedCurrent)) {
      const newOrder = currentArtifacts.filter((f) => artifacts.includes(f));
      artifacts.forEach((f) => {
        if (!newOrder.includes(f))
          newOrder.push(f);
      });
      currentArtifacts = newOrder;
      renderArtifacts();
    }
  } catch (error) {
    console.error("Failed to load artifacts:", error);
  }
}
updateTransform();
fetchArtifacts();
setInterval(fetchArtifacts, 5000);
