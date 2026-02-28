import { readdir } from "node:fs/promises";
import { join } from "node:path";

const PORT = 3000;
const PUBLIC_DIR = join(process.cwd(), "public");
const ARTIFACTS_DIR = join(process.cwd(), "artifacts");

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API: List artifacts
    if (url.pathname === "/api/artifacts") {
      try {
        const files = await readdir(ARTIFACTS_DIR);
        const htmlFiles = files.filter((file) => file.endsWith(".html"));
        return Response.json(htmlFiles);
      } catch (error) {
        return new Response("Error reading artifacts", { status: 500 });
      }
    }

    // Serve public static files
    let path = url.pathname;
    if (path === "/") path = "/index.html";
    
    // Check public/
    let file = Bun.file(join(PUBLIC_DIR, path));
    if (await file.exists()) {
      return new Response(file);
    }

    // Check artifacts/
    file = Bun.file(join(ARTIFACTS_DIR, path));
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${PORT}`);
