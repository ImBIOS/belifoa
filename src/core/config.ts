import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { BelifoaConfig } from "./types.js";

const CONFIG_DIR = join(homedir(), ".config", "belifoa");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function loadConfig(): BelifoaConfig {
  let fileConfig: BelifoaConfig = {};

  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      fileConfig = JSON.parse(content);
    } catch {
      // ignore parse error
    }
  }

  const apiKey = process.env.LINEAR_API_KEY || fileConfig.apiKey;
  const defaultTeam = process.env.BELIFOA_DEFAULT_TEAM || fileConfig.defaultTeam;
  const defaultFormat = (process.env.BELIFOA_FORMAT as any) || fileConfig.defaultFormat || "markdown";

  return {
    apiKey,
    defaultTeam,
    defaultFormat,
  };
}

export function saveConfig(config: Partial<BelifoaConfig>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const current = loadConfig();
  const updated = { ...current, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
}

export function resolveApiKey(): string {
  const config = loadConfig();
  if (config.apiKey) {
    return config.apiKey;
  }
  throw new Error(
    "Linear API key missing! Set LINEAR_API_KEY environment variable or run `belifoa auth set <lin_api_...>`"
  );
}
