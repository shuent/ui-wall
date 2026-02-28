# UI HTML Canvas

A local, framework-agnostic UI Prototype Wall for side-by-side visual comparison of HTML artifacts.

## Features

- **Infinite Canvas:** Pan (click and drag) and Zoom (scroll) freely.
- **Side-by-Side Comparison:** View multiple HTML artifacts simultaneously.
- **Isolation:** Each artifact is rendered in its own `<iframe>` to prevent style leaks.
- **Auto-Loading:** Automatically scans the `artifacts/` directory for `.html` files.

## Usage

1.  **Install dependencies:**
    ```bash
    bun install
    ```

2.  **Add your artifacts:**
    Drop your HTML files into the `artifacts/` directory.

3.  **Start the server:**
    ```bash
    bun start
    ```

4.  **View it:**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- `src/server/`: Backend logic (Bun).
- `src/client/`: Frontend logic (Vanilla TypeScript).
- `public/`: Static assets.
- `artifacts/`: Your HTML prototypes.
