import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
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
  const tmpFile = `${configFile}.tmp.${process.pid}.${Math.random().toString(36).substring(2, 8)}`;
  writeFileSync(tmpFile, JSON.stringify(config, null, 2), "utf-8");
  renameSync(tmpFile, configFile);
}

function checkDirectoryForConfig(dir: string): { profile?: string; team?: string; apiKey?: string; defaultAssignee?: string } | null {
  const jsonFile = join(dir, ".belifoarc.json");
  if (existsSync(jsonFile)) {
    try {
      const content = readFileSync(jsonFile, "utf-8");
      return JSON.parse(content);
    } catch {
      // ignore parse error
    }
  }

  const dotFile = join(dir, ".belifoa");
  if (existsSync(dotFile)) {
    try {
      const content = readFileSync(dotFile, "utf-8");
      return JSON.parse(content);
    } catch {
      // ignore parse error
    }
  }

  const dotJsonFile = join(dir, ".belifoa.json");
  if (existsSync(dotJsonFile)) {
    try {
      const content = readFileSync(dotJsonFile, "utf-8");
      return JSON.parse(content);
    } catch {
      // ignore parse error
    }
  }

  const mcpFile = join(dir, ".mcp.json");
  if (existsSync(mcpFile)) {
    try {
      const content = readFileSync(mcpFile, "utf-8");
      const data = JSON.parse(content);
      let profile: string | undefined = undefined;
      let team: string | undefined = undefined;

      if (data.mcpServers) {
        for (const [key, server] of Object.entries<any>(data.mcpServers)) {
          if (key.toLowerCase().includes("belifoa") || key.toLowerCase().includes("linear")) {
            if (server.env?.BELIFOA_PROFILE) profile = server.env.BELIFOA_PROFILE;
            if (server.env?.BELIFOA_DEFAULT_TEAM) team = server.env.BELIFOA_DEFAULT_TEAM;
          }
        }
      }
      if (!profile && data.env?.BELIFOA_PROFILE) profile = data.env.BELIFOA_PROFILE;
      if (!profile && data.profile) profile = data.profile;
      if (!profile && data.belifoaProfile) profile = data.belifoaProfile;
      if (!team && data.env?.BELIFOA_DEFAULT_TEAM) team = data.env.BELIFOA_DEFAULT_TEAM;
      if (!team && data.defaultTeam) team = data.defaultTeam;

      if (profile || team) {
        return { profile, team };
      }
    } catch {
      // ignore parse error
    }
  }

  return null;
}

function scanChildDirectoriesForConfig(
  dir: string,
  depth = 0,
  maxDepth = 2
): { profile?: string; team?: string; apiKey?: string; defaultAssignee?: string } | null {
  if (depth > maxDepth) return null;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (name.startsWith(".") || name === "node_modules" || name === "dist" || name === "build") continue;

      const childDir = join(dir, name);
      const conf = checkDirectoryForConfig(childDir);
      if (conf) return conf;

      if (depth < maxDepth) {
        const subConf = scanChildDirectoriesForConfig(childDir, depth + 1, maxDepth);
        if (subConf) return subConf;
      }
    }
  } catch {
    // ignore filesystem error
  }
  return null;
}

/**
 * Search upwards and downwards in directory tree for project-local .belifoarc.json, .belifoa, .belifoa.json, or .mcp.json
 */
export function getProjectConfig(startDir: string = process.cwd()): { profile?: string; team?: string; apiKey?: string; defaultAssignee?: string } | null {
  let currentDir = startDir;

  // 1. Traverse parent directories up to root
  while (true) {
    const conf = checkDirectoryForConfig(currentDir);
    if (conf) return conf;

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break; // reached filesystem root
    currentDir = parentDir;
  }

  // 2. Scan child subdirectories if ancestor search found nothing
  return scanChildDirectoriesForConfig(startDir);
}

/**
 * Get current git repository remote origin URL
 */
export function getGitRemoteUrl(cwd: string = process.cwd()): string | null {
  try {
    const url = execSync("git config --get remote.origin.url", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return url || null;
  } catch {
    return null;
  }
}

/**
 * Auto-detect matching profile from git remote origin URL
 */
export function detectProfileFromGitRemote(
  config: BelifoaConfig,
  cwd: string = process.cwd()
): AuthProfile | null {
  const remoteUrl = getGitRemoteUrl(cwd);
  if (!remoteUrl) return null;

  const normalizedRemote = remoteUrl.toLowerCase();
  const repoNameMatch = remoteUrl.match(/[\/:]([^\/:]+)\.git$/) || remoteUrl.match(/[\/:]([^\/:]+)$/);
  const repoName = repoNameMatch ? repoNameMatch[1].toLowerCase() : "";

  for (const profile of Object.values(config.profiles)) {
    // 1. Explicit remotes array in profile
    if (profile.remotes && profile.remotes.some((r) => normalizedRemote.includes(r.toLowerCase()))) {
      return profile;
    }

    // 2. Organization urlKey or name match
    if (profile.organization) {
      const urlKey = profile.organization.urlKey?.toLowerCase();
      const orgName = profile.organization.name?.toLowerCase();
      if (urlKey && (normalizedRemote.includes(urlKey) || repoName.includes(urlKey))) {
        return profile;
      }
      if (orgName && (normalizedRemote.includes(orgName) || repoName.includes(orgName))) {
        return profile;
      }
    }

    // 3. Profile name match against repo name or remote URL
    const pName = profile.name.toLowerCase();
    if (pName && (normalizedRemote.includes(pName) || repoName.includes(pName) || pName.includes(repoName))) {
      return profile;
    }
  }

  return null;
}

/**
 * Auto-detect team key from folder name or Git repository name
 */
export function detectTeamFromCwd(
  profile: AuthProfile,
  cwd: string = process.cwd()
): string | null {
  if (!profile.teams || profile.teams.length === 0) return null;

  const folderName = cwd.split("/").filter(Boolean).pop()?.toLowerCase() || "";
  const remoteUrl = getGitRemoteUrl(cwd);
  let repoName = "";
  if (remoteUrl) {
    const match = remoteUrl.match(/[\/:]([^\/:]+)\.git$/) || remoteUrl.match(/[\/:]([^\/:]+)$/);
    if (match) repoName = match[1].toLowerCase();
  }

  const candidates = [folderName, repoName].filter(Boolean);

  for (const candidate of candidates) {
    // 1. Exact match on team key (case-insensitive)
    const exactKey = profile.teams.find((t) => t.key.toLowerCase() === candidate);
    if (exactKey) return exactKey.key.toUpperCase();

    // 2. Exact match on team name (case-insensitive)
    const exactName = profile.teams.find((t) => t.name.toLowerCase() === candidate);
    if (exactName) return exactName.key.toUpperCase();

    // 3. Substring match (e.g., "orderly-app" matches team key "ORDERLY" or team name "Orderly")
    const subMatch = profile.teams.find((t) => {
      const k = t.key.toLowerCase();
      const n = t.name.toLowerCase();
      return candidate.includes(k) || k.includes(candidate) || candidate.includes(n) || n.includes(candidate);
    });
    if (subMatch) return subMatch.key.toUpperCase();
  }

  return null;
}

/**
 * Save project-local .belifoarc.json in target or current directory
 */
export function saveProjectConfig(
  projectDir: string,
  configData: { profile?: string; team?: string; defaultAssignee?: string }
): void {
  const file = join(projectDir, ".belifoarc.json");
  writeFileSync(file, JSON.stringify(configData, null, 2), "utf-8");
}

/**
 * Get active profile with strict isolation hierarchy:
 * 1. Explicit overrideProfileName (CLI flag --profile / tool parameter)
 * 2. Environment variable BELIFOA_PROFILE
 * 3. Project-local configuration (.belifoarc.json, .belifoa, or .belifoa.json in CWD tree)
 * 4. Auto-detected profile from Git remote origin URL
 * 5. Global ~/.config/belifoa/config.json activeProfile (Fallback)
 */
export function getActiveProfile(overrideProfileName?: string): AuthProfile | null {
  const config = loadConfig();
  const envKey = process.env.BELIFOA_API_KEY || process.env.LINEAR_API_KEY;
  const envTeam = process.env.BELIFOA_DEFAULT_TEAM;
  const envAssignee = process.env.BELIFOA_DEFAULT_ASSIGNEE;

  // 1. Explicit parameter override, env var, or project-local config
  const projectConfig = getProjectConfig();
  const targetName = overrideProfileName || process.env.BELIFOA_PROFILE || projectConfig?.profile;

  let active: AuthProfile | null = null;

  if (targetName && config.profiles[targetName]) {
    active = { ...config.profiles[targetName] };
  } else if (envKey) {
    active = {
      name: "env",
      apiKey: envKey,
      defaultTeam: envTeam || projectConfig?.team,
      defaultAssignee: envAssignee || projectConfig?.defaultAssignee,
    };
  } else {
    const gitProfile = detectProfileFromGitRemote(config);
    if (gitProfile) {
      active = { ...gitProfile };
    } else {
      const activeName = config.activeProfile || "default";
      if (config.profiles[activeName]) {
        active = { ...config.profiles[activeName] };
      }
    }
  }

  if (active) {
    if (envKey) active.apiKey = envKey;
    if (envTeam || projectConfig?.team) {
      active.defaultTeam = envTeam || projectConfig?.team;
    } else if (!active.defaultTeam) {
      const autoTeam = detectTeamFromCwd(active);
      if (autoTeam) {
        active.defaultTeam = autoTeam;
      }
    }
    const assigneeVal = envAssignee || projectConfig?.defaultAssignee || active.defaultAssignee;
    if (assigneeVal) {
      active.defaultAssignee = assigneeVal;
    }

    if (active.teams && active.teams.length > 0 && active.defaultTeam) {
      const valid = active.teams.some((t) => t.key.toUpperCase() === active.defaultTeam?.toUpperCase());
      if (!valid) {
        active.defaultTeam = active.teams[0].key.toUpperCase();
      }
    }
  }

  return active;
}

export function addProfile(
  name: string,
  apiKey: string,
  organization?: LinearOrganization,
  defaultTeam?: string,
  teams?: Array<{ key: string; name: string }>
): AuthProfile {
  const config = loadConfig();
  const resolvedTeams = teams || config.profiles[name]?.teams;
  let resolvedDefaultTeam = defaultTeam || config.profiles[name]?.defaultTeam;

  if (resolvedTeams && resolvedTeams.length > 0) {
    if (resolvedDefaultTeam) {
      const match = resolvedTeams.find((t) => t.key.toUpperCase() === resolvedDefaultTeam?.toUpperCase());
      if (match) {
        resolvedDefaultTeam = match.key.toUpperCase();
      } else {
        resolvedDefaultTeam = resolvedTeams[0].key.toUpperCase();
      }
    } else {
      resolvedDefaultTeam = resolvedTeams[0].key.toUpperCase();
    }
  }

  const profile: AuthProfile = {
    name,
    apiKey,
    organization,
    teams: resolvedTeams,
    defaultTeam: resolvedDefaultTeam,
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
  const activeProf = getActiveProfile(profileName);
  const targetName = profileName || activeProf?.name || config.activeProfile || "default";

  if (!config.profiles[targetName]) {
    throw new Error(`Auth profile '${targetName}' not found.`);
  }

  const targetProfile = config.profiles[targetName];
  const upperKey = teamKey.toUpperCase();

  if (targetProfile.teams && targetProfile.teams.length > 0) {
    const isAccessible = targetProfile.teams.some((t) => t.key.toUpperCase() === upperKey);
    if (!isAccessible) {
      throw new Error(
        `Team '${upperKey}' is not accessible in profile '${targetName}'. Accessible teams: ${targetProfile.teams.map((t) => t.key).join(", ")}`
      );
    }
  }

  targetProfile.defaultTeam = upperKey;
  saveConfig(config);
  return targetProfile;
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
