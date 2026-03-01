const viewport = document.getElementById("viewport")!;
const canvas = document.getElementById("canvas")!;
canvas.style.display = "flex";
const deviceToggle = document.getElementById("device-toggle") as HTMLInputElement;

type UiSection = {
  section: {
    label: string;
    items: string[];
  };
};

type UiCanvasConfig = {
  pages?: UiSection[];
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

let currentPages: UiSection[] = [];
let dragSourceFilename: string | null = null;
const cardMap = new Map<string, HTMLElement>();
const sectionMap = new Map<string, HTMLElement>();

function updateTransform() {
  canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  viewport.style.backgroundPosition = `${translateX}px ${translateY}px`;
}

function updateGrid() {
  const cardWidth = getComputedStyle(document.body).getPropertyValue("--card-width").trim();
  document.querySelectorAll(".section-items").forEach((container) => {
    const itemCount = container.querySelectorAll(".artifact-card").length;
    // Display all items in a single row
    (container as HTMLElement).style.gridTemplateColumns = `repeat(${itemCount}, ${cardWidth})`;
  });
}

function setMobileMode(isMobile: boolean) {
  if (deviceToggle.checked !== isMobile) {
    deviceToggle.checked = isMobile;
  }
  document.body.classList.toggle("mobile-mode", isMobile);
  updateGrid();
}

function areSamePages(a: UiSection[], b: UiSection[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((page, index) => {
    const other = b[index];
    return (
      page.section.label === other.section.label &&
      page.section.items.length === other.section.items.length &&
      page.section.items.every((item, i) => item === other.section.items[i])
    );
  });
}

async function updateConfigOnServer(newConfig: Partial<UiCanvasConfig>) {
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

    // Find source and target positions
    let sourceSecIdx = -1, sourceItemIdx = -1;
    let targetSecIdx = -1, targetItemIdx = -1;

    currentPages.forEach((page, sIdx) => {
      const iIdxS = page.section.items.indexOf(dragSourceFilename!);
      if (iIdxS !== -1) {
        sourceSecIdx = sIdx;
        sourceItemIdx = iIdxS;
      }
      const iIdxT = page.section.items.indexOf(filename);
      if (iIdxT !== -1) {
        targetSecIdx = sIdx;
        targetItemIdx = iIdxT;
      }
    });

    if (sourceSecIdx !== -1 && targetSecIdx !== -1) {
      // Swap items
      const temp = currentPages[sourceSecIdx].section.items[sourceItemIdx];
      currentPages[sourceSecIdx].section.items[sourceItemIdx] = currentPages[targetSecIdx].section.items[targetItemIdx];
      currentPages[targetSecIdx].section.items[targetItemIdx] = temp;

      renderArtifacts();
      void updateConfigOnServer({ pages: [...currentPages] });
    }

    return false;
  });

  return card;
}

function renderArtifacts() {
  const allArtifacts = new Set<string>();
  const currentSectionKeys = new Set<string>();

  currentPages.forEach((page, idx) => {
    const sectionKey = `section-${idx}`;
    currentSectionKeys.add(sectionKey);
    page.section.items.forEach((item) => allArtifacts.add(item));
  });

  // 1. Remove obsolete sections
  for (const [key, sectionEl] of sectionMap.entries()) {
    if (!currentSectionKeys.has(key)) {
      sectionEl.remove();
      sectionMap.delete(key);
    }
  }

  // 2. Remove obsolete cards
  for (const [filename, card] of cardMap.entries()) {
    if (!allArtifacts.has(filename)) {
      card.remove();
      cardMap.delete(filename);
    }
  }

  // 3. Render/Update current sections and cards
  currentPages.forEach((page, sectionIdx) => {
    const sectionKey = `section-${sectionIdx}`;
    let sectionEl = sectionMap.get(sectionKey);
    if (!sectionEl) {
      sectionEl = document.createElement("div");
      sectionEl.className = "section";

      const labelEl = document.createElement("div");
      labelEl.className = "section-label";
      sectionEl.appendChild(labelEl);

      const itemsEl = document.createElement("div");
      itemsEl.className = "section-items";
      sectionEl.appendChild(itemsEl);

      sectionMap.set(sectionKey, sectionEl);
      canvas.appendChild(sectionEl);
    }

    // Update label in case it changed
    const labelEl = sectionEl.querySelector(".section-label")!;
    if (labelEl.textContent !== page.section.label) {
      labelEl.textContent = page.section.label;
    }

    // Ensure section order
    sectionEl.style.order = sectionIdx.toString();

    const itemsEl = sectionEl.querySelector(".section-items") as HTMLElement;

    page.section.items.forEach((filename, itemIdx) => {
      let card = cardMap.get(filename);
      if (!card) {
        card = createCard(filename);
        cardMap.set(filename, card);
      }

      // Only append if it's not already in the correct parent
      if (card.parentElement !== itemsEl) {
        itemsEl.appendChild(card);
      }

      // Ensure card order within its section container
      card.style.order = itemIdx.toString();
    });
  });

  updateGrid();
}

async function syncConfig() {
  try {
    const response = await fetch("/api/config");
    const config = (await response.json()) as UiCanvasConfig;

    setMobileMode(config.device === "mobile");

    const nextPages = config.pages || [];
    if (!areSamePages(nextPages, currentPages)) {
      currentPages = [...nextPages];
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
