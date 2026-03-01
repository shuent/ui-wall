import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
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

const PORT = Number.parseInt(values.port!, 10);
// Use import.meta.dir to get the directory of the current file (portable)
const PUBLIC_DIR = join(import.meta.dir, "public");
const CONFIG_FILENAME = "ui-canvas-config.json";

type UiCanvasConfig = {
  pages: string[];
  device: "desktop" | "mobile";
};

const DEFAULT_CONFIG: UiCanvasConfig = { pages: [], device: "desktop" };

function normalizeConfig(input: Partial<UiCanvasConfig> | null | undefined): UiCanvasConfig {
  const pages = Array.isArray(input?.pages) ? input.pages.filter((page): page is string => typeof page === "string") : DEFAULT_CONFIG.pages;
  const device = input?.device === "mobile" || input?.device === "desktop" ? input.device : DEFAULT_CONFIG.device;

  return { pages: [...pages], device };
}

function resolveConfigPath() {
  return join(process.cwd(), CONFIG_FILENAME);
}

async function getConfig() {
  try {
    const configPath = resolveConfigPath();
    const content = await readFile(configPath, "utf-8");
    return normalizeConfig(JSON.parse(content) as Partial<UiCanvasConfig>);
  } catch (error) {
    return { ...DEFAULT_CONFIG, pages: [...DEFAULT_CONFIG.pages] };
  }
}

async function saveConfig(config: UiCanvasConfig) {
  const configPath = resolveConfigPath();
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
        const patch = (await req.json()) as Partial<UiCanvasConfig>;
        const currentConfig = await getConfig();
        const updatedConfig = normalizeConfig({
          pages: patch.pages ?? currentConfig.pages,
          device: patch.device ?? currentConfig.device,
        });
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
