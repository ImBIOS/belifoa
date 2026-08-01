import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { BelifoaConfig, AuthProfile, OutputFormat, LinearOrganization } from "./types.js";

const CONFIG_DIR = join(homedir(), ".config", "belifoa");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function loadConfig(): BelifoaConfig {
  let fileConfig: any = {};

  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      fileConfig = JSON.parse(content);
    } catch {
      // ignore parse error
    }
  }

  // Handle migration from legacy single apiKey format
  const profiles: Record<string, AuthProfile> = fileConfig.profiles || {};
  if (fileConfig.apiKey && !profiles["default"]) {
    profiles["default"] = {
      name: "default",
      apiKey: fileConfig.apiKey,
      defaultTeam: fileConfig.defaultTeam,
    };
  }

  let activeProfile = fileConfig.activeProfile || (Object.keys(profiles)[0] ?? "default");

  return {
    activeProfile,
    profiles,
    defaultFormat: (process.env.BELIFOA_FORMAT as OutputFormat) || fileConfig.defaultFormat || "markdown",
  };
}

export function saveConfig(config: BelifoaConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getActiveProfile(): AuthProfile | null {
  const config = loadConfig();

  // 1. Env variable overrides
  const envKey = process.env.BELIFOA_API_KEY || process.env.LINEAR_API_KEY;
  const envProfileName = process.env.BELIFOA_PROFILE;

  if (envProfileName && config.profiles[envProfileName]) {
    const profile = { ...config.profiles[envProfileName] };
    if (envKey) profile.apiKey = envKey;
    if (process.env.BELIFOA_DEFAULT_TEAM) profile.defaultTeam = process.env.BELIFOA_DEFAULT_TEAM;
    return profile;
  }

  if (envKey) {
    return {
      name: "env",
      apiKey: envKey,
      defaultTeam: process.env.BELIFOA_DEFAULT_TEAM,
    };
  }

  // 2. Profile from config file
  const activeName = config.activeProfile || "default";
  return config.profiles[activeName] || null;
}

export function addProfile(
  name: string,
  apiKey: string,
  organization?: LinearOrganization,
  defaultTeam?: string,
  teams?: Array<{ key: string; name: string }>
): AuthProfile {
  const config = loadConfig();
  const profile: AuthProfile = {
    name,
    apiKey,
    organization,
    teams: teams || config.profiles[name]?.teams,
    defaultTeam: defaultTeam || config.profiles[name]?.defaultTeam,
    createdAt: new Date().toISOString(),
  };

  config.profiles[name] = profile;
  if (!config.activeProfile || Object.keys(config.profiles).length === 1) {
    config.activeProfile = name;
  }

  saveConfig(config);
  return profile;
}

export function switchProfile(name: string): AuthProfile {
  const config = loadConfig();
  if (!config.profiles[name]) {
    throw new Error(`Auth profile '${name}' does not exist. Run \`belifoa auth add ${name} <key>\` to create it.`);
  }

  config.activeProfile = name;
  saveConfig(config);
  return config.profiles[name];
}

export function switchDefaultTeam(teamKey: string, profileName?: string): AuthProfile {
  const config = loadConfig();
  const targetName = profileName || config.activeProfile || "default";

  if (!config.profiles[targetName]) {
    throw new Error(`Auth profile '${targetName}' not found.`);
  }

  config.profiles[targetName].defaultTeam = teamKey.toUpperCase();
  saveConfig(config);
  return config.profiles[targetName];
}

export function removeProfile(name: string): void {
  const config = loadConfig();
  if (!config.profiles[name]) {
    throw new Error(`Auth profile '${name}' not found.`);
  }

  delete config.profiles[name];
  if (config.activeProfile === name) {
    config.activeProfile = Object.keys(config.profiles)[0] ?? undefined;
  }

  saveConfig(config);
}

export function listProfiles(): Array<{ profile: AuthProfile; isActive: boolean }> {
  const config = loadConfig();
  const activeName = getActiveProfile()?.name || config.activeProfile;

  return Object.values(config.profiles).map((p) => ({
    profile: p,
    isActive: p.name === activeName,
  }));
}
