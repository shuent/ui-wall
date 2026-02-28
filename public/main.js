// src/client/main.ts
var viewport = document.getElementById("viewport");
var canvas = document.getElementById("canvas");
var scale = 1;
var translateX = 0;
var translateY = 0;
var isDragging = false;
var lastX = 0;
var lastY = 0;
function updateTransform() {
  canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}
viewport.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
});
window.addEventListener("mousemove", (e) => {
  if (isDragging) {
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
  isDragging = false;
});
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomFactor = 1.1;
  const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const oldScale = scale;
  scale *= direction;
  scale = Math.min(Math.max(scale, 0.1), 5);
  const actualDirection = scale / oldScale;
  translateX = mouseX - (mouseX - translateX) * actualDirection;
  translateY = mouseY - (mouseY - translateY) * actualDirection;
  updateTransform();
}, { passive: false });
var currentArtifacts = [];
async function loadArtifacts() {
  try {
    const response = await fetch("/api/artifacts");
    const artifacts = await response.json();
    if (JSON.stringify(artifacts) === JSON.stringify(currentArtifacts)) {
      return;
    }
    currentArtifacts = artifacts;
    canvas.innerHTML = "";
    const cols = Math.ceil(Math.sqrt(artifacts.length));
    canvas.style.gridTemplateColumns = `repeat(${cols}, 600px)`;
    artifacts.forEach((filename) => {
      const card = document.createElement("div");
      card.className = "artifact-card";
      card.innerHTML = `
                <div class="artifact-header">
                    <span>${filename}</span>
                    <a href="/${filename}" target="_blank">↗</a>
                </div>
                <iframe class="artifact-iframe" src="/${filename}"></iframe>
            `;
      canvas.appendChild(card);
    });
  } catch (error) {
    console.error("Failed to load artifacts:", error);
  }
}
updateTransform();
loadArtifacts();
setInterval(loadArtifacts, 5000);
