# Support Sections in UI Config

## 1. Goal
Group pages into sections in the `ui-canvas-config.json` and display them with section labels on the infinite canvas.

## 2. Changes

### 2.1. Configuration Schema (`ui-canvas-config.json`)
The `pages` property in `UiCanvasConfig` will be updated to support section objects.

Current:
```json
{
  "pages": ["page1.html", "page2.html"],
  "device": "desktop"
}
```

New (Section Support):
```json
{
  "pages": [
    {
      "section": {
        "label": "dashboard",
        "items": ["dashboard_v1.html", "dashboard_v2.html"]
      }
    },
    {
      "section": {
        "label": "settings",
        "items": ["settings_v1.html"]
      }
    }
  ],
  "device": "desktop"
}
```

### 2.2. Frontend Implementation (`src/client/main.ts`)
- Update `UiCanvasConfig` type definition.
- Update `renderArtifacts` to handle sections.
- Add section headers to the canvas.
- Ensure drag-and-drop still works (or disable it for now if it gets too complex, but the prompt implies basic display first).
- Adjust `updateGrid` if necessary.

### 2.3. Styling (`public/styles.css`)
- Add styles for section headers.
- Ensure sections are laid out correctly (e.g., each section starts on a new row or has its own container).

## 3. Task List
- [ ] Update `UiCanvasConfig` type in `src/client/main.ts`.
- [ ] Create a test configuration file or update `ui-canvas-config.json`.
- [ ] Modify `renderArtifacts` to support sections.
- [ ] Add section label rendering.
- [ ] Update CSS for section headers.
- [ ] (Optional) Ensure backward compatibility for simple string arrays in `pages`.
