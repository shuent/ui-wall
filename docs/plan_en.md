# System Design and Task List

## 1. System Overview

**Objective:** A tool for side-by-side visual comparison and evaluation of local HTML artifacts (UI prototypes) on an infinite canvas. It renders independent HTML files directly without any framework dependencies.

### Architecture

*   **Runtime:** Bun (Fast JS runtime & bundler)
*   **Backend:** Bun `Serve` API
    *   Static file serving (Frontend app & artifacts)
    *   API: Fetch list of artifacts (`/api/artifacts`)
    *   (Optional) WebSocket: File change detection and hot reload
*   **Frontend:** Vanilla TypeScript + HTML/CSS
    *   Lightweight implementation without frameworks
    *   **Canvas UI:** Infinite canvas using CSS Transforms (`scale`, `translate`)
    *   **Rendering:** Uses `<iframe>` to isolate and display each artifact

### Proposed Directory Structure

```
/
├── artifacts/       # Directory for user-provided HTML files
├── public/          # Frontend static files (index.html, styles.css)
├── src/
│   ├── client/      # Frontend logic (canvas.ts, loader.ts)
│   └── server/      # Server logic (index.ts, file-scanner.ts)
├── package.json
└── tsconfig.json
```

## 2. Task List

### Phase 1: Core Features (MVP)

1.  **Project Setup**
    *   [ ] Create directory structure (`artifacts`, `src`, `public`)
    *   [ ] Create basic `index.html` and `styles.css`

2.  **Server Implementation (Bun)**
    *   [ ] Implement static file server (serve `public` and `artifacts`)
    *   [ ] Implement API to scan `artifacts` directory and return file list (`/api/artifacts`)

3.  **Frontend: Artifact Rendering**
    *   [ ] Implement logic to fetch file list from API
    *   [ ] Generate and place `<iframe>` for each file in the DOM

4.  **Frontend: Canvas Manipulation**
    *   [ ] Implement panning (moving) via mouse drag
    *   [ ] Implement zooming (scaling) via scroll wheel

### Phase 2: User Experience Enhancements

5.  **Layout Management**
    *   [ ] Automatic grid layout on initial load
    *   [ ] Simple drag-and-drop for moving artifacts

6.  **Developer Experience (DX)**
    *   [ ] Automatic detection of file additions/changes (polling or WebSocket)
    *   [ ] Document usage instructions in `README.md`
