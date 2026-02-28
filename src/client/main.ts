const viewport = document.getElementById('viewport')!;
const canvas = document.getElementById('canvas')!;

let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;

// Initialize canvas transform
function updateTransform() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

// Pan
viewport.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    }
});

window.addEventListener('mousemove', (e) => {
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

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// Zoom
viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Zoom relative to mouse position
    const oldScale = scale;
    scale *= direction;
    
    // Clamp scale
    scale = Math.min(Math.max(scale, 0.1), 5);

    const actualDirection = scale / oldScale;

    translateX = mouseX - (mouseX - translateX) * actualDirection;
    translateY = mouseY - (mouseY - translateY) * actualDirection;

    updateTransform();
}, { passive: false });

let currentArtifacts: string[] = [];

// Fetch and Render Artifacts
async function loadArtifacts() {
    try {
        const response = await fetch('/api/artifacts');
        const artifacts: string[] = await response.json();
        
        // Check if artifacts list changed
        if (JSON.stringify(artifacts) === JSON.stringify(currentArtifacts)) {
            return;
        }

        currentArtifacts = artifacts;
        canvas.innerHTML = ''; // Clear current

        // Arrange in grid
        const cols = Math.ceil(Math.sqrt(artifacts.length));
        canvas.style.gridTemplateColumns = `repeat(${cols}, 600px)`;

        artifacts.forEach(filename => {
            const card = document.createElement('div');
            card.className = 'artifact-card';
            
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
        console.error('Failed to load artifacts:', error);
    }
}

updateTransform();
loadArtifacts();

// Polling for changes every 5 seconds
setInterval(loadArtifacts, 5000);
