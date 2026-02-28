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
    viewport.style.backgroundPosition = `${translateX}px ${translateY}px`;
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
    // If over a card and not pressing a modifier key, let the natural scroll happen
    const isOverCard = (e.target as HTMLElement).closest('.artifact-card');
    if (isOverCard && !e.ctrlKey && !e.metaKey) {
        return;
    }

    e.preventDefault();
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const oldScale = scale;

    // Use a sensitivity factor that works well for both mouse wheels and trackpads
    // We use a multiplicative approach for a more natural feel across zoom levels
    const delta = e.deltaY;
    const zoomFactor = Math.pow(1.1, -delta / 100);
    
    scale *= zoomFactor;
    scale = Math.min(Math.max(scale, 0.05), 5);
    
    const actualZoom = scale / oldScale;
    
    // Zoom towards the cursor
    translateX = mouseX - (mouseX - translateX) * actualZoom;
    translateY = mouseY - (mouseY - translateY) * actualZoom;
    
    updateTransform();
}, { passive: false });

let currentArtifacts: string[] = [];
let dragSourceFilename: string | null = null;
const cardMap = new Map<string, HTMLElement>();

function createCard(filename: string, index: number): HTMLElement {
    const isExternal = filename.startsWith('http://') || filename.startsWith('https://');
    const url = isExternal ? filename : `/${filename}`;
    
    const card = document.createElement('div');
    card.className = 'artifact-card';
    card.setAttribute('draggable', 'true');
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
                updateConfigOnServer({ pages: currentArtifacts });
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

async function updateConfigOnServer(newConfig: { pages?: string[], device?: string }) {
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });
    } catch (error) {
        console.error('Failed to update config on server:', error);
    }
}

deviceToggle.addEventListener('change', () => {
    const isMobile = deviceToggle.checked;
    document.body.classList.toggle('mobile-mode', isMobile);
    updateGrid();
    updateConfigOnServer({ device: isMobile ? 'mobile' : 'desktop' });
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
        card.style.order = index.toString();
    });
}

async function syncConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        const isMobile = config.device === 'mobile';
        if (deviceToggle.checked !== isMobile) {
            deviceToggle.checked = isMobile;
            document.body.classList.toggle('mobile-mode', isMobile);
            updateGrid();
        }
        
        if (JSON.stringify(config.pages) !== JSON.stringify(currentArtifacts)) {
            currentArtifacts = config.pages || [];
            renderArtifacts();
        }
    } catch (error) {
        console.error('Failed to sync config:', error);
    }
}

async function init() {
    updateTransform();
    await syncConfig();
    setInterval(syncConfig, 2000);
}

init();

