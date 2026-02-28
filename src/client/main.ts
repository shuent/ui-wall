const viewport = document.getElementById('viewport')!;
const canvas = document.getElementById('canvas')!;

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let lastX = 0;
let lastY = 0;

function updateTransform() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

viewport.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('.artifact-card')) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        viewport.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
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

window.addEventListener('mouseup', () => {
    isPanning = false;
    viewport.style.cursor = 'grab';
});

viewport.addEventListener('wheel', (e) => {
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

let currentArtifacts: string[] = [];
let dragSourceFilename: string | null = null;
const cardMap = new Map<string, HTMLElement>();

function createCard(filename: string, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'artifact-card';
    card.setAttribute('draggable', 'true');
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

    card.addEventListener('dragstart', (e) => {
        dragSourceFilename = filename;
        card.classList.add('dragging');
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', filename);
        }
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.artifact-card').forEach(c => c.classList.remove('drag-over'));
        dragSourceFilename = null;
    });

    card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragSourceFilename !== null && dragSourceFilename !== filename) {
            card.classList.add('drag-over');
        }
        return false;
    });

    card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragSourceFilename !== null && dragSourceFilename !== filename) {
            const sourceIdx = currentArtifacts.indexOf(dragSourceFilename);
            const targetIdx = currentArtifacts.indexOf(filename);

            if (sourceIdx !== -1 && targetIdx !== -1) {
                // Direct Swap: only these two items change places
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

const deviceToggle = document.getElementById('device-toggle') as HTMLInputElement;

function updateGrid() {
    const cols = Math.ceil(Math.sqrt(currentArtifacts.length));
    const cardWidth = getComputedStyle(document.body).getPropertyValue('--card-width').trim();
    canvas.style.gridTemplateColumns = `repeat(${cols}, ${cardWidth})`;
}

deviceToggle.addEventListener('change', () => {
    if (deviceToggle.checked) {
        document.body.classList.add('mobile-mode');
    } else {
        document.body.classList.remove('mobile-mode');
    }
    updateGrid();
});

function renderArtifacts() {
    updateGrid();

    // Remove cards no longer in the list
    for (const [filename, card] of cardMap.entries()) {
        if (!currentArtifacts.includes(filename)) {
            card.remove();
            cardMap.delete(filename);
        }
    }

    // Add new cards or update order of existing ones
    currentArtifacts.forEach((filename, index) => {
        let card = cardMap.get(filename);
        if (!card) {
            card = createCard(filename, index);
            cardMap.set(filename, card);
            canvas.appendChild(card);
        }
        // Use CSS 'order' to visually rearrange without reloading the iframe
        card.style.order = index.toString();
    });
}

async function fetchArtifacts() {
    try {
        const response = await fetch('/api/artifacts');
        const artifacts: string[] = await response.json();
        
        const sortedNew = [...artifacts].sort();
        const sortedCurrent = [...currentArtifacts].sort();

        // Only trigger full sync if the actual files in the directory changed
        if (JSON.stringify(sortedNew) !== JSON.stringify(sortedCurrent)) {
            // Keep existing order for items that are still there, add new ones at the end
            const newOrder = currentArtifacts.filter(f => artifacts.includes(f));
            artifacts.forEach(f => {
                if (!newOrder.includes(f)) newOrder.push(f);
            });
            currentArtifacts = newOrder;
            renderArtifacts();
        }
    } catch (error) {
        console.error('Failed to load artifacts:', error);
    }
}

updateTransform();
fetchArtifacts();
setInterval(fetchArtifacts, 5000);
