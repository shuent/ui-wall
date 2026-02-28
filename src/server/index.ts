import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PORT = 3000;
const PUBLIC_DIR = join(process.cwd(), "public");
const ARTIFACTS_DIR = join(process.cwd(), "artifacts");
const CONFIG_FILE = join(process.cwd(), "config.json");

async function getConfig() {
  try {
    const content = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return { pages: [], device: 'desktop' };
  }
}

async function saveConfig(config: any) {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API: Get config
    if (url.pathname === "/api/config" && req.method === "GET") {
      const config = await getConfig();
      return Response.json(config);
    }

    // API: Update config
    if (url.pathname === "/api/config" && req.method === "POST") {
      try {
        const newConfig = await req.json();
        const currentConfig = await getConfig();
        const updatedConfig = { ...currentConfig, ...newConfig };
        await saveConfig(updatedConfig);
        return Response.json({ success: true });
      } catch (error) {
        return new Response("Error updating config", { status: 500 });
      }
    }

    // Serve public static files
    let path = url.pathname;
    if (path === "/") path = "/index.html";
    
    // Check public/
    let file = Bun.file(join(PUBLIC_DIR, path));
    if (await file.exists()) return new Response(file);

    // Check artifacts/
    file = Bun.file(join(ARTIFACTS_DIR, path));
    if (await file.exists()) return new Response(file);

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${PORT}`);
