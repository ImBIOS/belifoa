import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { BelifoaConfig, AuthProfile, OutputFormat, LinearOrganization } from "./types.js";

function getConfigDir(): string {
  return process.env.BELIFOA_CONFIG_DIR || join(homedir(), ".config", "belifoa");
}

function getConfigFile(): string {
  return process.env.BELIFOA_CONFIG_FILE || join(getConfigDir(), "config.json");
}

export function loadConfig(): BelifoaConfig {
  let fileConfig: any = {};
  const configFile = getConfigFile();

  if (existsSync(configFile)) {
    try {
      const content = readFileSync(configFile, "utf-8");
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
  const configDir = getConfigDir();
  const configFile = getConfigFile();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  writeFileSync(configFile, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Search upwards for project-local .belifoarc.json or .belifoa configuration
 */
export function getProjectConfig(startDir: string = process.cwd()): { profile?: string; team?: string; apiKey?: string } | null {
  let currentDir = startDir;
  while (true) {
    const jsonFile = join(currentDir, ".belifoarc.json");
    if (existsSync(jsonFile)) {
      try {
        const content = readFileSync(jsonFile, "utf-8");
        return JSON.parse(content);
      } catch {
        // ignore parse error
      }
    }

    const dotFile = join(currentDir, ".belifoa");
    if (existsSync(dotFile)) {
      try {
        const content = readFileSync(dotFile, "utf-8");
        return JSON.parse(content);
      } catch {
        // ignore parse error
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break; // reached filesystem root
    currentDir = parentDir;
  }
  return null;
}

/**
 * Save project-local .belifoarc.json in target or current directory
 */
export function saveProjectConfig(
  projectDir: string,
  configData: { profile?: string; team?: string }
): void {
  const file = join(projectDir, ".belifoarc.json");
  writeFileSync(file, JSON.stringify(configData, null, 2), "utf-8");
}

/**
 * Get active profile with strict isolation hierarchy:
 * 1. Explicit overrideProfileName (CLI flag --profile / tool parameter)
 * 2. Environment variable BELIFOA_PROFILE
 * 3. Project-local configuration (.belifoarc.json in current directory tree)
 * 4. Global ~/.config/belifoa/config.json activeProfile (Fallback)
 */
export function getActiveProfile(overrideProfileName?: string): AuthProfile | null {
  const config = loadConfig();
  const envKey = process.env.BELIFOA_API_KEY || process.env.LINEAR_API_KEY;
  const envTeam = process.env.BELIFOA_DEFAULT_TEAM;

  // 1. Explicit parameter override (from CLI --profile flag or MCP tool profileName)
  const targetName = overrideProfileName || process.env.BELIFOA_PROFILE || getProjectConfig()?.profile;

  if (targetName && config.profiles[targetName]) {
    const profile = { ...config.profiles[targetName] };
    if (envKey) profile.apiKey = envKey;
    const projectConfig = getProjectConfig();
    if (envTeam || projectConfig?.team) {
      profile.defaultTeam = envTeam || projectConfig?.team;
    }
    return profile;
  }

  // 2. Direct environment variable key without profile
  if (envKey) {
    return {
      name: "env",
      apiKey: envKey,
      defaultTeam: envTeam || getProjectConfig()?.team,
    };
  }

  // 3. Fallback to global activeProfile
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
