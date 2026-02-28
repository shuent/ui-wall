import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    port: {
      type: "string",
      short: "p",
      default: "3000",
    },
  },
  strict: false,
});

const PORT = parseInt(values.port!);
// Use import.meta.dir to get the directory of the current file (portable)
const PUBLIC_DIR = join(import.meta.dir, "public");
const CONFIG_FILENAME = "ui-canvas-config.json";

async function getConfig() {
  try {
    const configPath = join(process.cwd(), CONFIG_FILENAME);
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return { pages: [], device: 'desktop' };
  }
}

async function saveConfig(config: any) {
  const configPath = join(process.cwd(), CONFIG_FILENAME);
  await writeFile(configPath, JSON.stringify(config, null, 2));
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

    // Serve static files
    let path = url.pathname;
    
    // 1. Tool UI: Root / or /_ui/*
    if (path === "/") {
      return new Response(Bun.file(join(PUBLIC_DIR, "index.html")));
    }
    
    if (path.startsWith("/_ui/")) {
      const assetPath = path.replace("/_ui/", "");
      return new Response(Bun.file(join(PUBLIC_DIR, assetPath)));
    }

    // 2. Check Current Working Directory (for artifacts and their assets)
    const artifactFile = Bun.file(join(process.cwd(), path));
    if (await artifactFile.exists()) return new Response(artifactFile);

    // 3. Check as absolute path
    const absoluteFile = Bun.file(path);
    if (await absoluteFile.exists()) return new Response(absoluteFile);

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`UI Canvas running at http://localhost:${PORT}`);
console.log(`Working directory: ${process.cwd()}`);
console.log(`Config file: ${CONFIG_FILENAME}`);
