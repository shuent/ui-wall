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

## ⚠️ Security Warning

This tool is designed for **local development only**. Do not expose the port (default 3000) to the public internet or untrusted networks.

- **Arbitrary File Access (Path Traversal):** The current server implementation allows reading any file on your system that the process has permission to access. An attacker could potentially steal sensitive data like SSH keys, credentials, or system files.
- **Unauthenticated Configuration:** The `/api/config` endpoint allows anyone with access to the port to update the configuration file without authentication.
- **Indirect Command Execution:** While the server doesn't execute OS commands directly, modifying the configuration file could influence other scripts or tools that consume this JSON, potentially leading to command injection in those tools.
- **XSS/Phishing Risk:** An attacker could inject malicious URLs into the canvas config, which would then be rendered in your browser, allowing them to steal session data or perform actions on your behalf.

**Never run this server on a public IP.** Use a secure tunnel (like SSH tunneling) or a VPN if remote access is required.

## Development

- `src/server/`: Backend logic (Bun).
- `src/client/`: Frontend logic (Vanilla TypeScript).
- `public/`: Static assets.
- `artifacts/`: Your HTML prototypes.
