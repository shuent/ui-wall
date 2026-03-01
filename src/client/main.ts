const viewport = document.getElementById("viewport")!;
const canvas = document.getElementById("canvas")!;
const deviceToggle = document.getElementById("device-toggle") as HTMLInputElement;

type UiCanvasConfig = {
  pages?: string[];
  device?: "desktop" | "mobile";
};

const SYNC_INTERVAL_MS = 2000;
const MIN_SCALE = 0.05;
const MAX_SCALE = 5;

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let lastX = 0;
let lastY = 0;

let currentArtifacts: string[] = [];
let dragSourceFilename: string | null = null;
const cardMap = new Map<string, HTMLElement>();

function updateTransform() {
  canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  viewport.style.backgroundPosition = `${translateX}px ${translateY}px`;
}

function updateGrid() {
  const cols = Math.ceil(Math.sqrt(currentArtifacts.length || 1));
  const cardWidth = getComputedStyle(document.body).getPropertyValue("--card-width").trim();
  canvas.style.gridTemplateColumns = `repeat(${cols}, ${cardWidth})`;
}

function setMobileMode(isMobile: boolean) {
  if (deviceToggle.checked !== isMobile) {
    deviceToggle.checked = isMobile;
  }
  document.body.classList.toggle("mobile-mode", isMobile);
  updateGrid();
}

function areSameArtifacts(nextArtifacts: string[]) {
  if (nextArtifacts.length !== currentArtifacts.length) {
    return false;
  }

  return nextArtifacts.every((artifact, index) => artifact === currentArtifacts[index]);
}

async function updateConfigOnServer(newConfig: UiCanvasConfig) {
  try {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    });
  } catch (error) {
    console.error("Failed to update config on server:", error);
  }
}

function createCard(filename: string): HTMLElement {
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

    if (dragSourceFilename === null || dragSourceFilename === filename) {
      return false;
    }

    const sourceIdx = currentArtifacts.indexOf(dragSourceFilename);
    const targetIdx = currentArtifacts.indexOf(filename);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      [currentArtifacts[sourceIdx], currentArtifacts[targetIdx]] = [
        currentArtifacts[targetIdx],
        currentArtifacts[sourceIdx],
      ];
      renderArtifacts();
      void updateConfigOnServer({ pages: [...currentArtifacts] });
    }

    return false;
  });

  return card;
}

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
      card = createCard(filename);
      cardMap.set(filename, card);
      canvas.appendChild(card);
    }
    card.style.order = index.toString();
  });
}

async function syncConfig() {
  try {
    const response = await fetch("/api/config");
    const config = (await response.json()) as UiCanvasConfig;

    setMobileMode(config.device === "mobile");

    const nextArtifacts = config.pages || [];
    if (!areSameArtifacts(nextArtifacts)) {
      currentArtifacts = [...nextArtifacts];
      renderArtifacts();
    }
  } catch (error) {
    console.error("Failed to sync config:", error);
  }
}

viewport.addEventListener("mousedown", (e) => {
  if (e.button === 0 && !(e.target as HTMLElement).closest(".artifact-card")) {
    isPanning = true;
    lastX = e.clientX;
    lastY = e.clientY;
    viewport.style.cursor = "grabbing";
  }
});

window.addEventListener("mousemove", (e) => {
  if (!isPanning) {
    return;
  }

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  translateX += dx;
  translateY += dy;
  lastX = e.clientX;
  lastY = e.clientY;
  updateTransform();
});

window.addEventListener("mouseup", () => {
  isPanning = false;
  viewport.style.cursor = "grab";
});

viewport.addEventListener(
  "wheel",
  (e) => {
    const isOverCard = (e.target as HTMLElement).closest(".artifact-card");
    if (isOverCard && !e.ctrlKey && !e.metaKey) {
      return;
    }

    e.preventDefault();

    const oldScale = scale;
    const zoomFactor = Math.pow(1.1, -e.deltaY / 100);
    scale = Math.min(Math.max(scale * zoomFactor, MIN_SCALE), MAX_SCALE);

    const actualZoom = scale / oldScale;
    translateX = e.clientX - (e.clientX - translateX) * actualZoom;
    translateY = e.clientY - (e.clientY - translateY) * actualZoom;

    updateTransform();
  },
  { passive: false },
);

deviceToggle.addEventListener("change", () => {
  const isMobile = deviceToggle.checked;
  setMobileMode(isMobile);
  void updateConfigOnServer({ device: isMobile ? "mobile" : "desktop" });
});

async function init() {
  updateTransform();
  await syncConfig();
  setInterval(syncConfig, SYNC_INTERVAL_MS);
}

init();
