// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// src/core/types.ts
var BelifoaSuggestionError;
var init_types = __esm(() => {
  BelifoaSuggestionError = class BelifoaSuggestionError extends Error {
    suggestions;
    constructor(message, suggestions) {
      super(message);
      this.name = "BelifoaSuggestionError";
      this.suggestions = suggestions;
    }
  };
});

// src/core/config.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
function getConfigDir() {
  return process.env.BELIFOA_CONFIG_DIR || join(homedir(), ".config", "belifoa");
}
function getConfigFile() {
  return process.env.BELIFOA_CONFIG_FILE || join(getConfigDir(), "config.json");
}
function loadConfig() {
  let fileConfig = {};
  const configFile = getConfigFile();
  if (existsSync(configFile)) {
    try {
      const content = readFileSync(configFile, "utf-8");
      fileConfig = JSON.parse(content);
    } catch {}
  }
  const profiles = fileConfig.profiles || {};
  if (fileConfig.apiKey && !profiles["default"]) {
    profiles["default"] = {
      name: "default",
      apiKey: fileConfig.apiKey,
      defaultTeam: fileConfig.defaultTeam
    };
  }
  let activeProfile = fileConfig.activeProfile || (Object.keys(profiles)[0] ?? "default");
  return {
    activeProfile,
    profiles,
    defaultFormat: process.env.BELIFOA_FORMAT || fileConfig.defaultFormat || "markdown"
  };
}
function saveConfig(config) {
  const configDir = getConfigDir();
  const configFile = getConfigFile();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  const tmpFile = `${configFile}.tmp.${process.pid}.${Math.random().toString(36).substring(2, 8)}`;
  writeFileSync(tmpFile, JSON.stringify(config, null, 2), "utf-8");
  renameSync(tmpFile, configFile);
}
function checkDirectoryForConfig(dir) {
  const jsonFile = join(dir, ".belifoarc.json");
  if (existsSync(jsonFile)) {
    try {
      const content = readFileSync(jsonFile, "utf-8");
      return JSON.parse(content);
    } catch {}
  }
  const dotFile = join(dir, ".belifoa");
  if (existsSync(dotFile)) {
    try {
      const content = readFileSync(dotFile, "utf-8");
      return JSON.parse(content);
    } catch {}
  }
  const dotJsonFile = join(dir, ".belifoa.json");
  if (existsSync(dotJsonFile)) {
    try {
      const content = readFileSync(dotJsonFile, "utf-8");
      return JSON.parse(content);
    } catch {}
  }
  const mcpFile = join(dir, ".mcp.json");
  if (existsSync(mcpFile)) {
    try {
      const content = readFileSync(mcpFile, "utf-8");
      const data = JSON.parse(content);
      let profile = undefined;
      let team = undefined;
      if (data.mcpServers) {
        for (const [key, server] of Object.entries(data.mcpServers)) {
          if (key.toLowerCase().includes("belifoa") || key.toLowerCase().includes("linear")) {
            if (server.env?.BELIFOA_PROFILE)
              profile = server.env.BELIFOA_PROFILE;
            if (server.env?.BELIFOA_DEFAULT_TEAM)
              team = server.env.BELIFOA_DEFAULT_TEAM;
          }
        }
      }
      if (!profile && data.env?.BELIFOA_PROFILE)
        profile = data.env.BELIFOA_PROFILE;
      if (!profile && data.profile)
        profile = data.profile;
      if (!profile && data.belifoaProfile)
        profile = data.belifoaProfile;
      if (!team && data.env?.BELIFOA_DEFAULT_TEAM)
        team = data.env.BELIFOA_DEFAULT_TEAM;
      if (!team && data.defaultTeam)
        team = data.defaultTeam;
      if (profile || team) {
        return { profile, team };
      }
    } catch {}
  }
  return null;
}
function scanChildDirectoriesForConfig(dir, depth = 0, maxDepth = 2) {
  if (depth > maxDepth)
    return null;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory())
        continue;
      const name = entry.name;
      if (name.startsWith(".") || name === "node_modules" || name === "dist" || name === "build")
        continue;
      const childDir = join(dir, name);
      const conf = checkDirectoryForConfig(childDir);
      if (conf)
        return conf;
      if (depth < maxDepth) {
        const subConf = scanChildDirectoriesForConfig(childDir, depth + 1, maxDepth);
        if (subConf)
          return subConf;
      }
    }
  } catch {}
  return null;
}
function getProjectConfig(startDir = process.cwd()) {
  let currentDir = startDir;
  while (true) {
    const conf = checkDirectoryForConfig(currentDir);
    if (conf)
      return conf;
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir)
      break;
    currentDir = parentDir;
  }
  return scanChildDirectoriesForConfig(startDir);
}
function getGitRemoteUrl(cwd = process.cwd()) {
  try {
    const url = execSync("git config --get remote.origin.url", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return url || null;
  } catch {
    return null;
  }
}
function detectProfileFromGitRemote(config, cwd = process.cwd()) {
  const remoteUrl = getGitRemoteUrl(cwd);
  if (!remoteUrl)
    return null;
  const normalizedRemote = remoteUrl.toLowerCase();
  const repoNameMatch = remoteUrl.match(/[\/:]([^\/:]+)\.git$/) || remoteUrl.match(/[\/:]([^\/:]+)$/);
  const repoName = repoNameMatch ? repoNameMatch[1].toLowerCase() : "";
  for (const profile of Object.values(config.profiles)) {
    if (profile.remotes && profile.remotes.some((r) => normalizedRemote.includes(r.toLowerCase()))) {
      return profile;
    }
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
    const pName = profile.name.toLowerCase();
    if (pName && (normalizedRemote.includes(pName) || repoName.includes(pName) || pName.includes(repoName))) {
      return profile;
    }
  }
  return null;
}
function detectTeamFromCwd(profile, cwd = process.cwd()) {
  if (!profile.teams || profile.teams.length === 0)
    return null;
  const folderName = cwd.split("/").filter(Boolean).pop()?.toLowerCase() || "";
  const remoteUrl = getGitRemoteUrl(cwd);
  let repoName = "";
  if (remoteUrl) {
    const match = remoteUrl.match(/[\/:]([^\/:]+)\.git$/) || remoteUrl.match(/[\/:]([^\/:]+)$/);
    if (match)
      repoName = match[1].toLowerCase();
  }
  const candidates = [folderName, repoName].filter(Boolean);
  for (const candidate of candidates) {
    const exactKey = profile.teams.find((t) => t.key.toLowerCase() === candidate);
    if (exactKey)
      return exactKey.key.toUpperCase();
    const exactName = profile.teams.find((t) => t.name.toLowerCase() === candidate);
    if (exactName)
      return exactName.key.toUpperCase();
    const subMatch = profile.teams.find((t) => {
      const k = t.key.toLowerCase();
      const n = t.name.toLowerCase();
      return candidate.includes(k) || k.includes(candidate) || candidate.includes(n) || n.includes(candidate);
    });
    if (subMatch)
      return subMatch.key.toUpperCase();
  }
  return null;
}
function saveProjectConfig(projectDir, configData) {
  const file = join(projectDir, ".belifoarc.json");
  writeFileSync(file, JSON.stringify(configData, null, 2), "utf-8");
}
function getActiveProfile(overrideProfileName) {
  const config = loadConfig();
  const envKey = process.env.BELIFOA_API_KEY || process.env.LINEAR_API_KEY;
  const envTeam = process.env.BELIFOA_DEFAULT_TEAM;
  const envAssignee = process.env.BELIFOA_DEFAULT_ASSIGNEE;
  const projectConfig = getProjectConfig();
  const targetName = overrideProfileName || process.env.BELIFOA_PROFILE || projectConfig?.profile;
  let active = null;
  if (targetName && config.profiles[targetName]) {
    active = { ...config.profiles[targetName] };
  } else if (envKey) {
    active = {
      name: "env",
      apiKey: envKey,
      defaultTeam: envTeam || projectConfig?.team,
      defaultAssignee: envAssignee || projectConfig?.defaultAssignee
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
    if (envKey)
      active.apiKey = envKey;
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
function addProfile(name, apiKey, organization, defaultTeam, teams) {
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
  const profile = {
    name,
    apiKey,
    organization,
    teams: resolvedTeams,
    defaultTeam: resolvedDefaultTeam,
    createdAt: new Date().toISOString()
  };
  config.profiles[name] = profile;
  if (!config.activeProfile || Object.keys(config.profiles).length === 1) {
    config.activeProfile = name;
  }
  saveConfig(config);
  return profile;
}
function switchProfile(name) {
  const config = loadConfig();
  if (!config.profiles[name]) {
    throw new Error(`Auth profile '${name}' does not exist. Run \`belifoa auth add ${name} <key>\` to create it.`);
  }
  config.activeProfile = name;
  saveConfig(config);
  return config.profiles[name];
}
function switchDefaultTeam(teamKey, profileName) {
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
      throw new Error(`Team '${upperKey}' is not accessible in profile '${targetName}'. Accessible teams: ${targetProfile.teams.map((t) => t.key).join(", ")}`);
    }
  }
  targetProfile.defaultTeam = upperKey;
  saveConfig(config);
  return targetProfile;
}
function removeProfile(name) {
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
function listProfiles() {
  const config = loadConfig();
  const activeName = getActiveProfile()?.name || config.activeProfile;
  return Object.values(config.profiles).map((p) => ({
    profile: p,
    isActive: p.name === activeName
  }));
}
var init_config = () => {};

// src/core/formatters.ts
function getPriorityLabel(priority) {
  return PRIORITY_LABELS[priority] || "None";
}
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}
function shouldStripAnsi() {
  if (typeof process === "undefined" || !process.stdout)
    return false;
  return !process.stdout.isTTY && process.env.FORCE_COLOR !== "1";
}
function maybeStripAnsi(output, format) {
  if (format === "cli_table" && shouldStripAnsi()) {
    return stripAnsi(output);
  }
  return output;
}
function pad(str, length) {
  return (str + " ".repeat(length)).substring(0, length);
}
function generateGitBranchName(issue, userPrefix) {
  const idSlug = issue.identifier ? issue.identifier.toLowerCase() : "";
  const titleSlug = issue.title ? issue.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 50) : "";
  const rawAssignee = userPrefix || issue.assignee;
  let userSlug = "";
  if (rawAssignee) {
    userSlug = rawAssignee.toLowerCase().replace(/^@/, "").split(" ")[0].replace(/[^a-z0-9]/g, "");
  }
  return userSlug ? `${userSlug}/${idSlug}-${titleSlug}` : `${idSlug}-${titleSlug}`;
}
function cleanRawIssue(node) {
  const priority = node.priority ?? 0;
  const identifier = node.identifier;
  const title = node.title;
  const assignee = node.assignee?.name || node.assignee?.email;
  const parent = node.parent ? { id: node.parent.id, identifier: node.parent.identifier, title: node.parent.title } : undefined;
  const children = node.children?.nodes ? node.children.nodes.map((c) => ({
    id: c.id,
    identifier: c.identifier,
    title: c.title,
    status: c.state?.name || c.status,
    priority: c.priority
  })) : undefined;
  const relations = node.relations?.nodes ? node.relations.nodes.map((r) => ({
    id: r.id,
    type: r.type,
    relatedIssue: {
      id: r.relatedIssue?.id,
      identifier: r.relatedIssue?.identifier,
      title: r.relatedIssue?.title
    }
  })) : undefined;
  const gitBranchName = identifier && title ? generateGitBranchName({ identifier, title, assignee }) : undefined;
  return {
    id: node.id,
    identifier,
    title,
    description: node.description ?? undefined,
    priority,
    priorityLabel: getPriorityLabel(priority),
    status: node.state?.name || node.status || "Unknown",
    teamKey: node.team?.key,
    assignee,
    project: node.project?.name,
    labels: node.labels?.nodes ? node.labels.nodes.map((l) => l.name) : node.labels || [],
    estimate: node.estimate ?? undefined,
    dueDate: node.dueDate ?? undefined,
    url: node.url,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    comments: node.comments?.nodes ? node.comments.nodes.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      user: c.user ? { id: c.user.id, name: c.user.name, email: c.user.email } : undefined
    })) : undefined,
    parent,
    children,
    relations,
    gitBranchName
  };
}
function formatActiveProfileBanner(profile, format = "cli_table") {
  const active = profile === undefined ? getActiveProfile() : profile;
  if (!active)
    return "";
  const name = active.name;
  const org = active.organization?.name || active.organization?.urlKey || "N/A";
  const team = active.defaultTeam || "N/A";
  if (format === "compact_json" || format === "raw_json") {
    return "";
  }
  if (format === "markdown") {
    return `> **[belifoa] Active Profile**: \`${name}\` (Workspace: **${org}**, Default Team: **${team}**)
`;
  }
  return `\x1B[1m\x1B[34m[belifoa]\x1B[0m \x1B[1mActive Profile:\x1B[0m \x1B[36m${name}\x1B[0m (\x1B[1mWorkspace:\x1B[0m ${org}, \x1B[1mDefault Team:\x1B[0m ${team})
`;
}
function formatIssueList(issues, format = "cli_table", activeProfile) {
  if (format === "raw_json") {
    return JSON.stringify(issues, null, 2);
  }
  if (format === "compact_json") {
    return JSON.stringify(issues.map((i) => ({
      id: i.identifier,
      title: i.title,
      status: i.status,
      priority: i.priorityLabel,
      assignee: i.assignee || undefined,
      labels: i.labels?.length ? i.labels : undefined
    })));
  }
  const banner = formatActiveProfileBanner(activeProfile, format);
  if (issues.length === 0) {
    return (banner ? `${banner}
` : "") + "No issues found.";
  }
  if (format === "markdown") {
    const rows2 = issues.map((i) => {
      const assigneeStr = i.assignee ? `@${i.assignee}` : "-";
      const labelsStr = i.labels && i.labels.length > 0 ? `\`${i.labels.join(",")}\`` : "-";
      return `| [${i.identifier}](${i.url || ""}) | ${i.title.replace(/\|/g, "\\|")} | **${i.status}** | ${i.priorityLabel} | ${assigneeStr} | ${labelsStr} |`;
    });
    const content2 = [
      `Found ${issues.length} issue(s):`,
      "",
      "| ID | Title | Status | Priority | Assignee | Labels |",
      "|---|---|---|---|---|---|",
      ...rows2
    ].join(`
`);
    return banner ? `${banner}
${content2}` : content2;
  }
  const rows = issues.map((i) => ({
    id: i.identifier,
    title: i.title.length > 55 ? i.title.substring(0, 52) + "..." : i.title,
    status: i.status,
    priority: i.priorityLabel || "None",
    assignee: i.assignee ? `@${i.assignee}` : "-",
    labels: i.labels && i.labels.length > 0 ? i.labels.join(",") : "-"
  }));
  const maxId = Math.max(7, ...rows.map((r) => r.id.length));
  const maxTitle = Math.max(25, ...rows.map((r) => r.title.length));
  const maxStatus = Math.max(10, ...rows.map((r) => r.status.length));
  const maxPriority = Math.max(10, ...rows.map((r) => r.priority.length));
  const maxAssignee = Math.max(10, ...rows.map((r) => r.assignee.length));
  const header = `  ${pad("ID", maxId)}  ${pad("TITLE", maxTitle)}  ${pad("STATUS", maxStatus)}  ${pad("PRIORITY", maxPriority)}  ${pad("ASSIGNEE", maxAssignee)}`;
  const divider = `  ${"\u2500".repeat(maxId)}  ${"\u2500".repeat(maxTitle)}  ${"\u2500".repeat(maxStatus)}  ${"\u2500".repeat(maxPriority)}  ${"\u2500".repeat(maxAssignee)}`;
  const body = rows.map((r) => `  \x1B[1m\x1B[36m${pad(r.id, maxId)}\x1B[0m  ${pad(r.title, maxTitle)}  \x1B[32m${pad(r.status, maxStatus)}\x1B[0m  ${pad(r.priority, maxPriority)}  ${pad(r.assignee, maxAssignee)}`);
  const content = [
    `\x1B[1mFound ${issues.length} issue(s):\x1B[0m`,
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body
  ].join(`
`);
  return maybeStripAnsi(banner ? `${banner}
${content}` : content, format);
}
function formatIssueDetail(issue, format = "cli_table", activeProfile) {
  if (format === "raw_json") {
    return JSON.stringify(issue, null, 2);
  }
  if (format === "compact_json") {
    const clean = {
      id: issue.identifier,
      title: issue.title,
      status: issue.status,
      priority: issue.priorityLabel,
      team: issue.teamKey,
      assignee: issue.assignee,
      project: issue.project,
      labels: issue.labels,
      estimate: issue.estimate,
      dueDate: issue.dueDate,
      url: issue.url,
      gitBranchName: issue.gitBranchName,
      parent: issue.parent ? issue.parent.identifier || issue.parent.id : undefined,
      children: issue.children && issue.children.length > 0 ? issue.children.map((c) => c.identifier || c.id) : undefined,
      relations: issue.relations && issue.relations.length > 0 ? issue.relations.map((r) => ({ type: r.type, issue: r.relatedIssue?.identifier || r.relatedIssue?.id })) : undefined,
      description: issue.description
    };
    if (issue.comments && issue.comments.length > 0) {
      clean.comments = issue.comments.map((c) => ({
        author: c.user?.name,
        body: c.body,
        date: c.createdAt
      }));
    }
    Object.keys(clean).forEach((key) => clean[key] === undefined && delete clean[key]);
    return JSON.stringify(clean);
  }
  const banner = formatActiveProfileBanner(activeProfile, format);
  if (format === "markdown") {
    const lines2 = [
      `# [${issue.identifier}] ${issue.title}`,
      "",
      `- **Status**: ${issue.status}`,
      `- **Priority**: ${issue.priorityLabel}`,
      `- **Assignee**: ${issue.assignee ? `@${issue.assignee}` : "Unassigned"}`,
      `- **Team**: ${issue.teamKey || "N/A"}`
    ];
    if (issue.gitBranchName)
      lines2.push(`- **Git Branch**: \`${issue.gitBranchName}\``);
    if (issue.parent)
      lines2.push(`- **Parent**: [${issue.parent.identifier}] ${issue.parent.title}`);
    if (issue.children && issue.children.length > 0) {
      lines2.push(`- **Children**: ${issue.children.map((c) => `[${c.identifier}] ${c.title}`).join(", ")}`);
    }
    if (issue.relations && issue.relations.length > 0) {
      const relStr = issue.relations.map((r) => `${r.type.toUpperCase()}: [${r.relatedIssue?.identifier}] ${r.relatedIssue?.title}`).join("; ");
      lines2.push(`- **Relations**: ${relStr}`);
    }
    if (issue.project)
      lines2.push(`- **Project**: ${issue.project}`);
    if (issue.labels && issue.labels.length > 0)
      lines2.push(`- **Labels**: ${issue.labels.join(", ")}`);
    if (issue.estimate !== undefined)
      lines2.push(`- **Estimate**: ${issue.estimate} pts`);
    if (issue.dueDate)
      lines2.push(`- **Due Date**: ${issue.dueDate}`);
    if (issue.url)
      lines2.push(`- **URL**: ${issue.url}`);
    if (issue.description) {
      lines2.push("", "## Description", "", issue.description);
    }
    if (issue.comments && issue.comments.length > 0) {
      lines2.push("", `## Comments (${issue.comments.length})`, "");
      issue.comments.forEach((c) => {
        const authorStr = c.user?.name ? `@${c.user.name}` : "User";
        lines2.push(`> **${authorStr}** (${c.createdAt}):`, `> ${c.body.replace(/\n/g, `
> `)}`, "");
      });
    }
    const content2 = lines2.join(`
`);
    return banner ? `${banner}
${content2}` : content2;
  }
  const lines = [
    `\x1B[1m\x1B[36m[${issue.identifier}]\x1B[0m \x1B[1m${issue.title}\x1B[0m`,
    `\x1B[2m${"\u2500".repeat(60)}\x1B[0m`,
    `  \x1B[1mStatus\x1B[0m:    \x1B[32m${issue.status}\x1B[0m`,
    `  \x1B[1mPriority\x1B[0m:  ${issue.priorityLabel}`,
    `  \x1B[1mAssignee\x1B[0m:  ${issue.assignee ? `@${issue.assignee}` : "Unassigned"}`,
    `  \x1B[1mTeam\x1B[0m:      ${issue.teamKey || "N/A"}`
  ];
  if (issue.gitBranchName)
    lines.push(`  \x1B[1mGit Branch\x1B[0m: \x1B[33m${issue.gitBranchName}\x1B[0m`);
  if (issue.parent)
    lines.push(`  \x1B[1mParent\x1B[0m:     [${issue.parent.identifier}] ${issue.parent.title}`);
  if (issue.children && issue.children.length > 0) {
    lines.push(`  \x1B[1mChildren\x1B[0m:   ${issue.children.map((c) => `[${c.identifier}]`).join(", ")}`);
  }
  if (issue.relations && issue.relations.length > 0) {
    const relStr = issue.relations.map((r) => `${r.type}: [${r.relatedIssue?.identifier}]`).join(", ");
    lines.push(`  \x1B[1mRelations\x1B[0m:  ${relStr}`);
  }
  if (issue.project)
    lines.push(`  \x1B[1mProject\x1B[0m:   ${issue.project}`);
  if (issue.labels && issue.labels.length > 0)
    lines.push(`  \x1B[1mLabels\x1B[0m:    ${issue.labels.join(", ")}`);
  if (issue.estimate !== undefined)
    lines.push(`  \x1B[1mEstimate\x1B[0m:  ${issue.estimate} pts`);
  if (issue.dueDate)
    lines.push(`  \x1B[1mDue Date\x1B[0m:  ${issue.dueDate}`);
  if (issue.url)
    lines.push(`  \x1B[1mURL\x1B[0m:       \x1B[4m${issue.url}\x1B[0m`);
  if (issue.description) {
    lines.push("", `\x1B[1mDescription:\x1B[0m`, issue.description);
  }
  if (issue.comments && issue.comments.length > 0) {
    lines.push("", `\x1B[1mComments (${issue.comments.length}):\x1B[0m`);
    issue.comments.forEach((c) => {
      const authorStr = c.user?.name ? `@${c.user.name}` : "User";
      lines.push(`  \uD83D\uDCAC \x1B[1m${authorStr}\x1B[0m \x1B[2m(${c.createdAt})\x1B[0m`, `     ${c.body.replace(/\n/g, `
     `)}`);
    });
  }
  const content = lines.join(`
`);
  return maybeStripAnsi(banner ? `${banner}
${content}` : content, format);
}
function formatTeams(teams, format = "cli_table", activeProfile) {
  if (format === "raw_json")
    return JSON.stringify(teams, null, 2);
  if (format === "compact_json")
    return JSON.stringify(teams.map((t) => ({ key: t.key, name: t.name, id: t.id })));
  const banner = formatActiveProfileBanner(activeProfile, format);
  if (teams.length === 0) {
    return (banner ? `${banner}
` : "") + "No teams found.";
  }
  if (format === "markdown") {
    const rows = teams.map((t) => `| **${t.key}** | ${t.name} | \`${t.id}\` |`);
    const content2 = ["### Teams:", "", "| Key | Name | ID |", "|---|---|---|", ...rows].join(`
`);
    return banner ? `${banner}
${content2}` : content2;
  }
  const maxKey = Math.max(6, ...teams.map((t) => t.key.length));
  const maxName = Math.max(20, ...teams.map((t) => t.name.length));
  const maxId = Math.max(10, ...teams.map((t) => t.id.length));
  const header = `  ${pad("KEY", maxKey)}  ${pad("NAME", maxName)}  ${pad("ID", maxId)}`;
  const divider = `  ${"\u2500".repeat(maxKey)}  ${"\u2500".repeat(maxName)}  ${"\u2500".repeat(maxId)}`;
  const body = teams.map((t) => `  \x1B[1m\x1B[36m${pad(t.key, maxKey)}\x1B[0m  ${pad(t.name, maxName)}  \x1B[2m${pad(t.id, maxId)}\x1B[0m`);
  const content = [
    `\x1B[1m\uD83D\uDC65 Linear Teams:\x1B[0m`,
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body
  ].join(`
`);
  return maybeStripAnsi(banner ? `${banner}
${content}` : content, format);
}
function formatProjects(projects, format = "cli_table", activeProfile) {
  if (format === "raw_json")
    return JSON.stringify(projects, null, 2);
  if (format === "compact_json")
    return JSON.stringify(projects.map((p) => ({ name: p.name, state: p.state, progress: p.progress ? `${Math.round(p.progress * 100)}%` : undefined })));
  const banner = formatActiveProfileBanner(activeProfile, format);
  if (projects.length === 0) {
    return (banner ? `${banner}
` : "") + "No projects found.";
  }
  if (format === "markdown") {
    const rows2 = projects.map((p) => {
      const progStr = p.progress !== undefined ? `${Math.round(p.progress * 100)}%` : "N/A";
      return `| ${p.name} | ${p.state || "Active"} | ${progStr} |`;
    });
    const content2 = ["### Projects:", "", "| Name | State | Progress |", "|---|---|---|", ...rows2].join(`
`);
    return banner ? `${banner}
${content2}` : content2;
  }
  const rows = projects.map((p) => ({
    name: p.name,
    state: p.state || "Active",
    progress: p.progress !== undefined ? `${Math.round(p.progress * 100)}%` : "N/A"
  }));
  const maxName = Math.max(25, ...rows.map((r) => r.name.length));
  const maxState = Math.max(10, ...rows.map((r) => r.state.length));
  const maxProg = Math.max(10, ...rows.map((r) => r.progress.length));
  const header = `  ${pad("PROJECT NAME", maxName)}  ${pad("STATE", maxState)}  ${pad("PROGRESS", maxProg)}`;
  const divider = `  ${"\u2500".repeat(maxName)}  ${"\u2500".repeat(maxState)}  ${"\u2500".repeat(maxProg)}`;
  const body = rows.map((r) => `  \x1B[1m${pad(r.name, maxName)}\x1B[0m  \x1B[32m${pad(r.state, maxState)}\x1B[0m  ${pad(r.progress, maxProg)}`);
  const content = [
    `\x1B[1m\uD83D\uDCC1 Linear Projects:\x1B[0m`,
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body
  ].join(`
`);
  return maybeStripAnsi(banner ? `${banner}
${content}` : content, format);
}
function formatProfiles(profiles, format = "cli_table", activeProfile) {
  if (format === "raw_json")
    return JSON.stringify(profiles, null, 2);
  if (format === "compact_json") {
    return JSON.stringify(profiles.map(({ profile, isActive }) => ({
      profile: profile.name,
      org: profile.organization?.name || "N/A",
      active: isActive,
      teams: profile.teams?.map((t) => t.key) || ["ALL"],
      defaultTeam: profile.defaultTeam || "N/A"
    })));
  }
  const banner = formatActiveProfileBanner(activeProfile, format);
  if (profiles.length === 0) {
    return (banner ? `${banner}
` : "") + "\u274C No authentication profiles saved.";
  }
  if (format === "markdown") {
    const rows2 = profiles.map(({ profile, isActive }) => {
      const activeMarker = isActive ? "\u2705 **Active**" : "-";
      const orgStr = profile.organization?.name ? `${profile.organization.name} (\`${profile.organization.urlKey}\`)` : "N/A";
      const teamsStr = profile.teams && profile.teams.length > 0 ? profile.teams.map((t) => `\`${t.key}\``).join(", ") : "All Teams";
      const keyMasked = profile.apiKey ? `${profile.apiKey.substring(0, 11)}...` : "N/A";
      return `| **${profile.name}** | ${orgStr} | ${teamsStr} | \`${profile.defaultTeam || "None"}\` | \`${keyMasked}\` | ${activeMarker} |`;
    });
    const content2 = [
      "### \uD83D\uDD10 Saved Linear Authentication Profiles (Workspaces):",
      "",
      "| Profile | Workspace / Org | Accessible Teams | Default Team | API Key | Status |",
      "|---|---|---|---|---|---|",
      ...rows2
    ].join(`
`);
    return banner ? `${banner}
${content2}` : content2;
  }
  const rows = profiles.map(({ profile, isActive }) => {
    const status = isActive ? "\u2705 Active" : "   -   ";
    const name = profile.name;
    const org = profile.organization?.name ? `${profile.organization.name} (${profile.organization.urlKey})` : "N/A";
    const teamsStr = profile.teams && profile.teams.length > 0 ? profile.teams.map((t) => t.key).join(", ") : "All Teams";
    const team = profile.defaultTeam || "None";
    const key = profile.apiKey ? `${profile.apiKey.substring(0, 11)}...` : "N/A";
    return { status, name, org, teamsStr, team, key, isActive };
  });
  const maxStatus = Math.max(8, ...rows.map((r) => r.status.length));
  const maxName = Math.max(10, ...rows.map((r) => r.name.length));
  const maxOrg = Math.max(22, ...rows.map((r) => r.org.length));
  const maxTeams = Math.max(18, ...rows.map((r) => r.teamsStr.length));
  const maxTeam = Math.max(12, ...rows.map((r) => r.team.length));
  const maxKey = Math.max(13, ...rows.map((r) => r.key.length));
  const header = `  ${pad("STATUS", maxStatus)}  ${pad("PROFILE", maxName)}  ${pad("WORKSPACE / ORGANIZATION", maxOrg)}  ${pad("ACCESSIBLE TEAMS", maxTeams)}  ${pad("DEFAULT TEAM", maxTeam)}  ${pad("API KEY", maxKey)}`;
  const divider = `  ${"\u2500".repeat(maxStatus)}  ${"\u2500".repeat(maxName)}  ${"\u2500".repeat(maxOrg)}  ${"\u2500".repeat(maxTeams)}  ${"\u2500".repeat(maxTeam)}  ${"\u2500".repeat(maxKey)}`;
  const body = rows.map((r) => {
    const rowStr = `  ${pad(r.status, maxStatus)}  ${pad(r.name, maxName)}  ${pad(r.org, maxOrg)}  ${pad(r.teamsStr, maxTeams)}  ${pad(r.team, maxTeam)}  ${pad(r.key, maxKey)}`;
    return r.isActive ? `\x1B[1m\x1B[32m${rowStr}\x1B[0m` : rowStr;
  });
  const content = [
    "\x1B[1m\x1B[36m\uD83D\uDD10 Saved Linear Authentication Profiles (Workspaces):\x1B[0m",
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body,
    ""
  ].join(`
`);
  return maybeStripAnsi(banner ? `${banner}
${content}` : content, format);
}
function formatLabels(labels, format = "cli_table", activeProfile) {
  if (format === "raw_json")
    return JSON.stringify(labels, null, 2);
  if (format === "compact_json")
    return JSON.stringify(labels.map((l) => ({ name: l.name, id: l.id })));
  const banner = formatActiveProfileBanner(activeProfile, format);
  if (labels.length === 0) {
    return (banner ? `${banner}
` : "") + "No labels found.";
  }
  if (format === "markdown") {
    const rows = labels.map((l) => `| **${l.name}** | \`${l.id}\` |`);
    const content2 = ["### Issue Labels:", "", "| Name | ID |", "|---|---|", ...rows].join(`
`);
    return banner ? `${banner}
${content2}` : content2;
  }
  const maxName = Math.max(15, ...labels.map((l) => l.name.length));
  const maxId = Math.max(10, ...labels.map((l) => l.id.length));
  const header = `  ${pad("LABEL NAME", maxName)}  ${pad("ID", maxId)}`;
  const divider = `  ${"\u2500".repeat(maxName)}  ${"\u2500".repeat(maxId)}`;
  const body = labels.map((l) => `  \x1B[1m\x1B[36m${pad(l.name, maxName)}\x1B[0m  \x1B[2m${pad(l.id, maxId)}\x1B[0m`);
  const content = [
    `\x1B[1m\uD83C\uDFF7\uFE0F Linear Issue Labels (${labels.length}):\x1B[0m`,
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body
  ].join(`
`);
  return maybeStripAnsi(banner ? `${banner}
${content}` : content, format);
}
var PRIORITY_LABELS;
var init_formatters = __esm(() => {
  init_config();
  PRIORITY_LABELS = {
    0: "None",
    1: "Urgent \uD83D\uDD34",
    2: "High \uD83D\uDFE0",
    3: "Normal \uD83D\uDFE1",
    4: "Low \uD83D\uDD35"
  };
});

// src/core/client.ts
class BelifoaClient {
  apiKey;
  profileName;
  constructor(apiKey, profileName) {
    this.profileName = profileName;
    this.apiKey = apiKey || getActiveProfile(profileName)?.apiKey || "";
  }
  setApiKey(key) {
    this.apiKey = key;
  }
  getProfileName() {
    return this.profileName;
  }
  getApiKey() {
    return this.apiKey || getActiveProfile(this.profileName)?.apiKey || "";
  }
  async graphql(query, variables = {}) {
    if (!this.apiKey) {
      this.apiKey = getActiveProfile(this.profileName)?.apiKey || "";
    }
    if (!this.apiKey) {
      throw new Error("Linear API Key is missing! Set LINEAR_API_KEY environment variable, run `bun x github:ImBIOS/belifoa#canary auth set <key>`, or call `linear_set_api_key` tool.");
    }
    const res = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey
      },
      body: JSON.stringify({ query, variables })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Linear API HTTP Error ${res.status}: ${text}`);
    }
    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(`Linear GraphQL Error: ${json.errors.map((e) => e.message).join(", ")}`);
    }
    if (!json.data) {
      throw new Error("Linear GraphQL returned no data.");
    }
    return json.data;
  }
  async getMe() {
    const query = `
      query Me {
        viewer {
          id
          name
          email
        }
      }
    `;
    const data = await this.graphql(query);
    return data.viewer;
  }
  async getOrganization() {
    const query = `
      query GetOrg {
        organization {
          id
          name
          urlKey
        }
      }
    `;
    const data = await this.graphql(query);
    return data.organization;
  }
  async getUsers() {
    const query = `
      query GetUsers {
        users {
          nodes {
            id
            name
            email
          }
        }
      }
    `;
    const data = await this.graphql(query);
    return data.users?.nodes || [];
  }
  async getIssueLabels() {
    const query = `
      query GetIssueLabels {
        issueLabels {
          nodes {
            id
            name
          }
        }
      }
    `;
    const data = await this.graphql(query);
    return data.issueLabels?.nodes || [];
  }
  async getTeamStates(teamId) {
    const query = `
      query GetTeamStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    `;
    const data = await this.graphql(query, { teamId });
    return data.team?.states?.nodes || [];
  }
  async resolveIssueId(identifierOrId) {
    if (!identifierOrId)
      return "";
    if (identifierOrId.includes("-") && identifierOrId.length > 25)
      return identifierOrId;
    const issue = await this.getIssue(identifierOrId);
    return issue.id;
  }
  async createIssueRelation(issueId, relatedIssueId, type = "blocks") {
    const mutation = `
      mutation CreateIssueRelation($input: IssueRelationCreateInput!) {
        issueRelationCreate(input: $input) {
          success
        }
      }
    `;
    const data = await this.graphql(mutation, {
      input: { issueId, relatedIssueId, type }
    });
    return data.issueRelationCreate?.success ?? false;
  }
  async resolveUserId(assigneeStr) {
    if (!assigneeStr)
      return;
    if (assigneeStr.includes("-") && assigneeStr.length > 20)
      return assigneeStr;
    const cleanStr = assigneeStr.replace(/^@/, "").toLowerCase();
    if (cleanStr === "me") {
      const me = await this.getMe();
      return me.id;
    }
    const users = await this.getUsers();
    const match = users.find((u) => u.id === assigneeStr || u.email?.toLowerCase() === cleanStr || u.name.toLowerCase() === cleanStr || u.name.toLowerCase().includes(cleanStr));
    if (!match) {
      throw new BelifoaSuggestionError(`Assignee '${assigneeStr}' not found in workspace.`, {
        error: `Assignee '${assigneeStr}' not found in workspace`,
        availableUsers: users.map((u) => ({ name: u.name, email: u.email, id: u.id }))
      });
    }
    return match.id;
  }
  async resolveProjectId(projectStr) {
    if (!projectStr)
      return;
    if (projectStr.includes("-") && projectStr.length > 20)
      return projectStr;
    const projects = await this.getProjects();
    const cleanStr = projectStr.toLowerCase();
    const match = projects.find((p) => p.id === projectStr || p.name.toLowerCase() === cleanStr || p.name.toLowerCase().includes(cleanStr));
    if (!match) {
      throw new BelifoaSuggestionError(`Project '${projectStr}' not found in workspace.`, {
        error: `Project '${projectStr}' not found in workspace`,
        availableProjects: projects.map((p) => ({ name: p.name, id: p.id, state: p.state }))
      });
    }
    return match.id;
  }
  async resolveStateId(teamId, stateStr) {
    if (!stateStr)
      return;
    if (stateStr.includes("-") && stateStr.length > 20)
      return stateStr;
    const states = await this.getTeamStates(teamId);
    const cleanStr = stateStr.toLowerCase();
    let match = states.find((s) => s.id === stateStr || s.name.toLowerCase() === cleanStr || s.type.toLowerCase() === cleanStr);
    if (!match && ["done", "completed", "closed", "resolved"].includes(cleanStr)) {
      match = states.find((s) => s.type.toLowerCase() === "completed");
    }
    if (!match) {
      throw new BelifoaSuggestionError(`State '${stateStr}' not found for team.`, {
        error: `State '${stateStr}' not found for team`,
        availableStates: states.map((s) => ({ name: s.name, type: s.type, id: s.id }))
      });
    }
    return match.id;
  }
  async resolveLabelIds(labelsInput) {
    if (!labelsInput)
      return [];
    const labelsArr = typeof labelsInput === "string" ? labelsInput.split(",").map((s) => s.trim()).filter(Boolean) : labelsInput;
    if (labelsArr.length === 0)
      return [];
    const resultIds = [];
    const unresolvedNames = [];
    for (const label of labelsArr) {
      if (label.includes("-") && label.length > 20) {
        resultIds.push(label);
      } else {
        unresolvedNames.push(label.toLowerCase());
      }
    }
    if (unresolvedNames.length > 0) {
      const allLabels = await this.getIssueLabels();
      for (const name of unresolvedNames) {
        const match = allLabels.find((l) => l.id === name || l.name.toLowerCase() === name);
        if (match)
          resultIds.push(match.id);
      }
    }
    return resultIds;
  }
  async searchIssues(queryStr, options = {}) {
    const limit = options.limit || 15;
    const cleanQuery = queryStr ? queryStr.trim() : "";
    const issueFields = `
      id
      identifier
      title
      description
      priority
      estimate
      dueDate
      url
      createdAt
      updatedAt
      state { name }
      team { key }
      assignee { name email }
      project { name }
      labels { nodes { name } }
      parent { id identifier title }
      children { nodes { id identifier title priority state { name } } }
      relations { nodes { id type relatedIssue { id identifier title } } }
    `;
    if (!cleanQuery) {
      const teamFilter = options.teamKey ? { team: { key: { eq: options.teamKey.toUpperCase() } } } : undefined;
      const query2 = `
        query ListIssues($filter: IssueFilter, $first: Int) {
          issues(filter: $filter, first: $first) {
            nodes {
              ${issueFields}
            }
          }
        }
      `;
      const data2 = await this.graphql(query2, {
        filter: teamFilter,
        first: limit
      });
      let nodes2 = data2.issues?.nodes || [];
      if (options.teamKey) {
        nodes2 = nodes2.filter((n) => n.team?.key?.toUpperCase() === options.teamKey?.toUpperCase());
      }
      return nodes2.map(cleanRawIssue);
    }
    const query = `
      query SearchIssues($term: String!, $first: Int) {
        searchIssues(term: $term, first: $first) {
          nodes {
            ${issueFields}
          }
        }
      }
    `;
    const data = await this.graphql(query, {
      term: cleanQuery,
      first: limit
    });
    let nodes = data.searchIssues?.nodes || [];
    if (options.teamKey) {
      nodes = nodes.filter((n) => n.team?.key?.toUpperCase() === options.teamKey?.toUpperCase());
    }
    return nodes.map(cleanRawIssue);
  }
  async getIssue(identifierOrId) {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          priority
          estimate
          dueDate
          url
          createdAt
          updatedAt
          state { name }
          team { key }
          assignee { name email }
          project { name }
          labels { nodes { name } }
          parent { id identifier title }
          children { nodes { id identifier title priority state { name } } }
          relations { nodes { id type relatedIssue { id identifier title } } }
          comments(first: 20) {
            nodes {
              id
              body
              createdAt
              user { id name email }
            }
          }
        }
      }
    `;
    const data = await this.graphql(query, { id: identifierOrId });
    if (!data.issue) {
      throw new Error(`Issue not found: ${identifierOrId}`);
    }
    return cleanRawIssue(data.issue);
  }
  async getMyIssues(limit = 20) {
    const query = `
      query MyIssues($first: Int) {
        viewer {
          assignedIssues(first: $first, orderBy: updatedAt) {
            nodes {
              id
              identifier
              title
              description
              priority
              estimate
              dueDate
              url
              createdAt
              updatedAt
              state { name }
              team { key }
              assignee { name email }
              project { name }
              labels { nodes { name } }
              parent { id identifier title }
              children { nodes { id identifier title priority state { name } } }
              relations { nodes { id type relatedIssue { id identifier title } } }
            }
          }
        }
      }
    `;
    const data = await this.graphql(query, {
      first: limit
    });
    return (data.viewer?.assignedIssues?.nodes || []).map(cleanRawIssue);
  }
  async createIssue(params) {
    if (params.checkExisting) {
      const existing = await this.searchIssues(params.title, {
        teamKey: params.teamIdOrKey,
        limit: 10
      }).catch(() => []);
      const match2 = existing.find((i) => i.title.trim().toLowerCase() === params.title.trim().toLowerCase());
      if (match2) {
        return match2;
      }
    }
    let teamId = params.teamIdOrKey;
    const teams = await this.getTeams();
    const match = teams.find((t) => t.key.toUpperCase() === params.teamIdOrKey.toUpperCase() || t.id === params.teamIdOrKey);
    if (match) {
      teamId = match.id;
    } else {
      throw new BelifoaSuggestionError(`Team '${params.teamIdOrKey}' not found in workspace.`, {
        error: `Team '${params.teamIdOrKey}' not found in workspace`,
        availableTeams: teams.map((t) => ({ key: t.key, name: t.name, id: t.id }))
      });
    }
    const assigneeId = params.assignee ? await this.resolveUserId(params.assignee) : undefined;
    const projectId = params.project ? await this.resolveProjectId(params.project) : undefined;
    const stateId = params.state ? await this.resolveStateId(teamId, params.state) : undefined;
    const labelIds = params.labels ? await this.resolveLabelIds(params.labels) : undefined;
    const parentId = params.parentId ? await this.resolveIssueId(params.parentId) : undefined;
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            priority
            estimate
            dueDate
            url
            createdAt
            state { name }
            team { key }
            assignee { name email }
            project { name }
            labels { nodes { name } }
            parent { id identifier title }
            children { nodes { id identifier title priority state { name } } }
            relations { nodes { id type relatedIssue { id identifier title } } }
          }
        }
      }
    `;
    const input = {
      teamId,
      title: params.title,
      description: params.description,
      priority: params.priority !== undefined ? Number(params.priority) : 0,
      assigneeId,
      projectId,
      stateId,
      estimate: params.estimate !== undefined ? Number(params.estimate) : undefined,
      dueDate: params.dueDate,
      labelIds,
      parentId
    };
    Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);
    const data = await this.graphql(mutation, { input });
    if (!data.issueCreate.success || !data.issueCreate.issue) {
      throw new Error("Failed to create Linear issue.");
    }
    const createdIssue = cleanRawIssue(data.issueCreate.issue);
    if (params.blockedBy) {
      const blockedByArr = Array.isArray(params.blockedBy) ? params.blockedBy : params.blockedBy.split(",").map((s) => s.trim());
      for (const item of blockedByArr) {
        if (!item)
          continue;
        const blockingId = await this.resolveIssueId(item);
        if (blockingId) {
          await this.createIssueRelation(blockingId, createdIssue.id, "blocks").catch(() => {});
        }
      }
    }
    if (params.blocks) {
      const blocksArr = Array.isArray(params.blocks) ? params.blocks : params.blocks.split(",").map((s) => s.trim());
      for (const item of blocksArr) {
        if (!item)
          continue;
        const blockedId = await this.resolveIssueId(item);
        if (blockedId) {
          await this.createIssueRelation(createdIssue.id, blockedId, "blocks").catch(() => {});
        }
      }
    }
    if (params.blockedBy || params.blocks) {
      return await this.getIssue(createdIssue.id).catch(() => createdIssue);
    }
    return createdIssue;
  }
  async updateIssue(id, params) {
    const existing = await this.getIssue(id).catch(() => {
      return;
    });
    const teamId = existing?.teamKey ? (await this.getTeams()).find((t) => t.key === existing.teamKey)?.id : undefined;
    const assigneeId = params.assignee ? await this.resolveUserId(params.assignee) : undefined;
    const projectId = params.project ? await this.resolveProjectId(params.project) : undefined;
    const stateId = params.state && teamId ? await this.resolveStateId(teamId, params.state) : undefined;
    const labelIds = params.labels ? await this.resolveLabelIds(params.labels) : undefined;
    const parentId = params.parentId ? await this.resolveIssueId(params.parentId) : undefined;
    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            priority
            estimate
            dueDate
            url
            updatedAt
            state { name }
            team { key }
            assignee { name email }
            project { name }
            labels { nodes { name } }
            parent { id identifier title }
            children { nodes { id identifier title priority state { name } } }
            relations { nodes { id type relatedIssue { id identifier title } } }
          }
        }
      }
    `;
    const input = {
      title: params.title,
      description: params.description,
      priority: params.priority !== undefined ? Number(params.priority) : undefined,
      assigneeId,
      projectId,
      stateId,
      estimate: params.estimate !== undefined ? Number(params.estimate) : undefined,
      dueDate: params.dueDate,
      labelIds,
      parentId
    };
    Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);
    const data = await this.graphql(mutation, {
      id: existing?.id || id,
      input
    });
    if (!data.issueUpdate.success || !data.issueUpdate.issue) {
      throw new Error(`Failed to update issue ${id}`);
    }
    const updatedIssue = cleanRawIssue(data.issueUpdate.issue);
    if (params.blockedBy) {
      const blockedByArr = Array.isArray(params.blockedBy) ? params.blockedBy : params.blockedBy.split(",").map((s) => s.trim());
      for (const item of blockedByArr) {
        if (!item)
          continue;
        const blockingId = await this.resolveIssueId(item);
        if (blockingId) {
          await this.createIssueRelation(blockingId, updatedIssue.id, "blocks").catch(() => {});
        }
      }
    }
    if (params.blocks) {
      const blocksArr = Array.isArray(params.blocks) ? params.blocks : params.blocks.split(",").map((s) => s.trim());
      for (const item of blocksArr) {
        if (!item)
          continue;
        const blockedId = await this.resolveIssueId(item);
        if (blockedId) {
          await this.createIssueRelation(updatedIssue.id, blockedId, "blocks").catch(() => {});
        }
      }
    }
    if (params.blockedBy || params.blocks) {
      return await this.getIssue(updatedIssue.id).catch(() => updatedIssue);
    }
    return updatedIssue;
  }
  async createBulkIssues(issues, defaultTeam, checkExisting) {
    const created = [];
    const errors = [];
    for (let i = 0;i < issues.length; i++) {
      const item = issues[i];
      try {
        const teamKey = item.teamIdOrKey || defaultTeam;
        if (!teamKey) {
          throw new Error("Missing team key/ID in issue item and no default team provided.");
        }
        const issue = await this.createIssue({
          ...item,
          teamIdOrKey: teamKey,
          checkExisting: item.checkExisting ?? checkExisting
        });
        created.push(issue);
      } catch (err) {
        errors.push({
          index: i,
          title: item.title || `Issue #${i + 1}`,
          error: err.message || "Unknown error"
        });
      }
    }
    return { created, errors };
  }
  async addComment(issueId, body) {
    const mutation = `
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            createdAt
          }
        }
      }
    `;
    const data = await this.graphql(mutation, {
      input: { issueId, body }
    });
    if (!data.commentCreate.success || !data.commentCreate.comment) {
      throw new Error(`Failed to create comment on issue ${issueId}`);
    }
    return data.commentCreate.comment;
  }
  async getTeams() {
    const query = `
      query GetTeams {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;
    const data = await this.graphql(query);
    return data.teams?.nodes || [];
  }
  async getProjects() {
    const query = `
      query GetProjects {
        projects {
          nodes {
            id
            name
            state
            progress
          }
        }
      }
    `;
    const data = await this.graphql(query);
    return data.projects?.nodes || [];
  }
}
var LINEAR_GRAPHQL_ENDPOINT = "https://api.linear.app/graphql";
var init_client = __esm(() => {
  init_config();
  init_formatters();
  init_types();
});

// src/mcp/tools.ts
function getMcpToolSchemas(overrideProfileName) {
  const active = getActiveProfile(overrideProfileName);
  const profileName = active?.name || overrideProfileName || "default";
  const prefix = `belifoa_${profileName}_`;
  return [
    { ...authStatusToolSchema, name: `${prefix}auth_status` },
    { ...authListToolSchema, name: `${prefix}auth_list` },
    { ...authSwitchToolSchema, name: `${prefix}auth_switch` },
    { ...setApiKeyToolSchema, name: `${prefix}set_api_key` },
    { ...getIssueToolSchema, name: `${prefix}get_issue` },
    { ...searchIssuesToolSchema, name: `${prefix}search_issues` },
    { ...getMyIssuesToolSchema, name: `${prefix}get_my_issues` },
    { ...manageIssueToolSchema, name: `${prefix}manage_issue` },
    {
      name: `${prefix}create_issue`,
      description: "Create a new Linear issue in the workspace.",
      inputSchema: {
        type: "object",
        properties: {
          teamKey: { type: "string", description: "Team key (e.g. ENG). Uses default team if omitted." },
          title: { type: "string", description: "Issue title" },
          description: { type: "string", description: "Issue description" },
          priority: { type: "number", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" },
          assignee: { type: "string", description: "Assignee user ID, email, or name" },
          project: { type: "string", description: "Project name or ID" },
          estimate: { type: "number", description: "Story points estimate" },
          dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
          labels: { type: "array", items: { type: "string" } },
          state: { type: "string", description: "Initial workflow state" },
          parentId: { type: "string", description: "Parent issue ID" },
          checkExisting: { type: "boolean", description: "If true, check if issue with same title exists before creating" },
          idempotent: { type: "boolean", description: "If true, check if issue with same title exists before creating (alias)" },
          profileName: { type: "string", description: "Target workspace profile name" },
          format: { type: "string", enum: ["markdown", "compact_json"], default: "markdown" }
        },
        required: ["title"]
      }
    },
    {
      name: `${prefix}list_issues`,
      description: "List or search issues for a team or query in the workspace.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query or keyword" },
          teamKey: { type: "string", description: "Team key filter (e.g. 'ENG')" },
          limit: { type: "number", default: 15 },
          profileName: { type: "string", description: "Target workspace profile name" },
          format: { type: "string", enum: ["markdown", "compact_json", "raw_json"], default: "markdown" }
        }
      }
    },
    { ...bulkCreateIssuesToolSchema, name: `${prefix}bulk_create_issues` },
    { ...getTeamsAndProjectsToolSchema, name: `${prefix}get_teams_and_projects` },
    { ...getLabelsToolSchema, name: `${prefix}get_labels` }
  ];
}
function getAuthGuidanceMessage() {
  const profiles = listProfiles();
  const profileListStr = profiles.length > 0 ? `Saved Profiles: ${profiles.map((p) => p.profile.name + (p.isActive ? " (Active)" : "")).join(", ")}` : "No profiles saved yet.";
  return [
    "\uD83D\uDD12 **Linear Authentication Required**",
    "",
    "**Instructions for AI Agent**:",
    "Linear authentication is currently missing or invalid.",
    "Please inform the user interactively in chat that they need to provide a Linear Personal API Key.",
    "",
    `_Current Status_: ${profileListStr}`,
    "",
    "**Options for User**:",
    "1. **Provide Key in Chat**: Paste your Personal API Key (starts with `lin_api_`) here, and I will save it using `linear_set_api_key`.",
    "2. **Switch Profile**: If you already saved a profile, run `linear_auth_switch({ profileName: 'playzuzu' })`.",
    "3. **CLI Setup**: Run `bun x github:ImBIOS/belifoa#canary auth add <profile-name> <lin_api_...>` in your terminal.",
    "",
    "_To create a Personal API Key, go to Linear Settings -> Account -> API -> Personal API keys._"
  ].join(`
`);
}
async function handleToolCall(name, args, client) {
  const format = args.format || "markdown";
  let cleanName = name;
  let prefixProfile = undefined;
  const rest = name.replace(/^(?:belifoa|linear)_/, "");
  if (KNOWN_BASE_ACTIONS.has(rest)) {
    cleanName = rest;
  } else {
    const idx = rest.indexOf("_");
    if (idx !== -1) {
      const possibleProf = rest.substring(0, idx);
      const possibleAction = rest.substring(idx + 1);
      if (KNOWN_BASE_ACTIONS.has(possibleAction)) {
        prefixProfile = possibleProf;
        cleanName = possibleAction;
      } else {
        cleanName = rest;
      }
    } else {
      cleanName = rest;
    }
  }
  if (prefixProfile && !args.profileName) {
    args.profileName = prefixProfile;
  }
  const active = getActiveProfile(args.profileName);
  const targetClient = args.profileName && args.profileName !== client.getProfileName() && client.getProfileName() !== undefined ? new BelifoaClient(undefined, args.profileName) : client;
  if (cleanName === "create_issue") {
    args.action = "create";
    cleanName = "manage_issue";
  } else if (cleanName === "update_issue") {
    args.action = "update";
    cleanName = "manage_issue";
  } else if (cleanName === "close_issue" || cleanName === "resolve_issue") {
    args.action = "close";
    cleanName = "manage_issue";
  } else if (cleanName === "list_issues" || cleanName === "my_issues") {
    cleanName = args.query ? "search_issues" : "get_my_issues";
  } else if (cleanName === "issue") {
    cleanName = "get_issue";
  }
  try {
    switch (cleanName) {
      case "auth_status": {
        try {
          const me = await targetClient.getMe();
          const org = await targetClient.getOrganization();
          return {
            content: [
              {
                type: "text",
                text: [
                  `\u2705 **Active Profile**: \`${active?.name || "default"}\``,
                  `- **Workspace / Org**: ${org.name} (\`${org.urlKey}\`)`,
                  `- **User**: ${me.name} (${me.email || me.id})`,
                  `- **Default Team**: ${active?.defaultTeam || "None"}`
                ].join(`
`)
              }
            ]
          };
        } catch {
          return { content: [{ type: "text", text: getAuthGuidanceMessage() }] };
        }
      }
      case "auth_list": {
        const profiles = listProfiles();
        return { content: [{ type: "text", text: formatProfiles(profiles, format, active) }] };
      }
      case "auth_switch": {
        let msgParts = [];
        if (args.profileName) {
          const profile = switchProfile(args.profileName);
          client.setApiKey(profile.apiKey);
          msgParts.push(`Switched active profile to **'${profile.name}'**`);
        }
        if (args.teamKey) {
          const profile = switchDefaultTeam(args.teamKey);
          msgParts.push(`Set default team for profile **'${profile.name}'** to **'${profile.defaultTeam}'**`);
        }
        if (msgParts.length === 0) {
          throw new Error("Specify either profileName or teamKey to switch.");
        }
        const org = await client.getOrganization();
        return {
          content: [
            {
              type: "text",
              text: `\u2705 ${msgParts.join(" and ")}.
Workspace: **${org.name}** (\`${org.urlKey}\`)`
            }
          ]
        };
      }
      case "set_api_key": {
        if (!args.apiKey || typeof args.apiKey !== "string") {
          throw new Error("apiKey parameter is required.");
        }
        const profileName = args.profileName || "default";
        const tempClient = new BelifoaClient(args.apiKey);
        const org = await tempClient.getOrganization();
        const me = await tempClient.getMe();
        const teams = await tempClient.getTeams().catch(() => []);
        const profile = addProfile(profileName, args.apiKey, org, args.teamKey, teams.map((t) => ({ key: t.key, name: t.name })));
        client.setApiKey(args.apiKey);
        return {
          content: [
            {
              type: "text",
              text: [
                `\u2705 Saved & activated Linear API Key for profile **'${profile.name}'**!`,
                `- **Workspace / Org**: ${org.name} (\`${org.urlKey}\`)`,
                `- **User**: ${me.name} (${me.email || me.id})`,
                `- **Default Team**: ${profile.defaultTeam || "None"}`
              ].join(`
`)
            }
          ]
        };
      }
      case "get_issue": {
        const issue = await targetClient.getIssue(args.id);
        return { content: [{ type: "text", text: formatIssueDetail(issue, format, active) }] };
      }
      case "search_issues": {
        const teamKey = args.teamKey || active?.defaultTeam;
        const issues = await targetClient.searchIssues(args.query || "", {
          teamKey,
          limit: args.limit
        });
        return { content: [{ type: "text", text: formatIssueList(issues, format, active) }] };
      }
      case "get_my_issues": {
        const issues = await targetClient.getMyIssues(args.limit || 20);
        return { content: [{ type: "text", text: formatIssueList(issues, format, active) }] };
      }
      case "manage_issue": {
        if (args.action === "bulk_create") {
          const defaultTeam = args.teamKey || active?.defaultTeam;
          const checkExisting = Boolean(args.checkExisting || args.idempotent);
          const items = (args.issues || []).map((i) => ({
            teamIdOrKey: i.team || defaultTeam,
            title: i.title,
            description: i.description,
            priority: i.priority,
            assignee: i.assignee || active?.defaultAssignee,
            project: i.project,
            estimate: i.estimate,
            dueDate: i.dueDate,
            labels: i.labels,
            state: i.state,
            parentId: i.parentId,
            blockedBy: i.blockedBy,
            blocks: i.blocks
          }));
          const result = await targetClient.createBulkIssues(items, defaultTeam, checkExisting);
          const parts = [];
          if (result.created.length > 0) {
            parts.push(`\u2705 Created ${result.created.length} issue(s):

${formatIssueList(result.created, format, active)}`);
          }
          if (result.errors.length > 0) {
            parts.push(`\u26A0\uFE0F Failed to create ${result.errors.length} issue(s):
${result.errors.map((e) => `- Item #${e.index + 1} "${e.title}": ${e.error}`).join(`
`)}`);
          }
          return { content: [{ type: "text", text: parts.join(`

`) }] };
        }
        if (args.action === "create") {
          const team = args.teamKey || active?.defaultTeam;
          if (!team || !args.title) {
            throw new Error("teamKey and title are required when action is 'create'. (Set default team or pass teamKey)");
          }
          const created = await targetClient.createIssue({
            teamIdOrKey: team,
            title: args.title,
            description: args.description,
            priority: args.priority,
            assignee: args.assignee || active?.defaultAssignee,
            project: args.project,
            estimate: args.estimate,
            dueDate: args.dueDate,
            labels: args.labels,
            state: args.state,
            parentId: args.parentId,
            blockedBy: args.blockedBy,
            blocks: args.blocks,
            checkExisting: Boolean(args.checkExisting || args.idempotent)
          });
          return { content: [{ type: "text", text: `\u2705 Created issue:

${formatIssueDetail(created, format, active)}` }] };
        }
        if (args.action === "update") {
          if (!args.issueId)
            throw new Error("issueId is required for 'update'.");
          const updated = await targetClient.updateIssue(args.issueId, {
            title: args.title,
            description: args.description,
            priority: args.priority,
            assignee: args.assignee,
            project: args.project,
            estimate: args.estimate,
            dueDate: args.dueDate,
            labels: args.labels,
            state: args.state,
            parentId: args.parentId,
            blockedBy: args.blockedBy,
            blocks: args.blocks
          });
          if (args.commentBody) {
            await targetClient.addComment(args.issueId, args.commentBody);
            const refreshed = await targetClient.getIssue(args.issueId).catch(() => updated);
            return { content: [{ type: "text", text: `\u2705 Updated issue:

${formatIssueDetail(refreshed, format, active)}` }] };
          }
          return { content: [{ type: "text", text: `\u2705 Updated issue:

${formatIssueDetail(updated, format, active)}` }] };
        }
        if (args.action === "close" || args.action === "resolve") {
          if (!args.issueId)
            throw new Error("issueId is required for 'close' or 'resolve'.");
          const updated = await targetClient.updateIssue(args.issueId, { state: "Done" });
          if (args.commentBody) {
            await targetClient.addComment(args.issueId, args.commentBody);
          }
          const refreshed = args.commentBody ? await targetClient.getIssue(args.issueId).catch(() => updated) : updated;
          return { content: [{ type: "text", text: `\u2705 Closed/Resolved issue ${args.issueId}:

${formatIssueDetail(refreshed, format, active)}` }] };
        }
        if (args.action === "comment") {
          if (!args.issueId || !args.commentBody) {
            throw new Error("issueId and commentBody are required for 'comment'.");
          }
          const comment = await targetClient.addComment(args.issueId, args.commentBody);
          return {
            content: [
              {
                type: "text",
                text: `\u2705 Added comment to ${args.issueId}:
> ${comment.body}`
              }
            ]
          };
        }
        throw new Error(`Unsupported action: ${args.action}`);
      }
      case "bulk_create_issues": {
        const defaultTeam = args.defaultTeamKey || active?.defaultTeam;
        const checkExisting = Boolean(args.checkExisting || args.idempotent);
        const items = (args.issues || []).map((i) => ({
          teamIdOrKey: i.team || defaultTeam,
          title: i.title,
          description: i.description,
          priority: i.priority,
          assignee: i.assignee || active?.defaultAssignee,
          project: i.project,
          estimate: i.estimate,
          dueDate: i.dueDate,
          labels: i.labels,
          state: i.state,
          parentId: i.parentId,
          blockedBy: i.blockedBy,
          blocks: i.blocks
        }));
        const result = await targetClient.createBulkIssues(items, defaultTeam, checkExisting);
        const parts = [];
        if (result.created.length > 0) {
          parts.push(`\u2705 Created ${result.created.length} issue(s):

${formatIssueList(result.created, format, active)}`);
        }
        if (result.errors.length > 0) {
          parts.push(`\u26A0\uFE0F Failed to create ${result.errors.length} issue(s):
${result.errors.map((e) => `- Item #${e.index + 1} "${e.title}": ${e.error}`).join(`
`)}`);
        }
        return { content: [{ type: "text", text: parts.join(`

`) }] };
      }
      case "get_teams_and_projects": {
        const teams = await targetClient.getTeams();
        const projects = await targetClient.getProjects();
        const text = [formatTeams(teams, format, active), "", formatProjects(projects, format, active)].join(`
`);
        return { content: [{ type: "text", text }] };
      }
      case "get_labels": {
        const labels = await targetClient.getIssueLabels();
        return { content: [{ type: "text", text: formatLabels(labels, format, active) }] };
      }
      default:
        throw new Error(`Unknown tool name: ${name}`);
    }
  } catch (err) {
    if (err.suggestions) {
      return { content: [{ type: "text", text: JSON.stringify(err.suggestions, null, 2) }] };
    }
    if (err.message?.includes("Linear API Key is missing") || err.message?.includes("Authentication failed") || err.message?.includes("401")) {
      return { content: [{ type: "text", text: getAuthGuidanceMessage() }] };
    }
    throw err;
  }
}
var authStatusToolSchema, authListToolSchema, authSwitchToolSchema, setApiKeyToolSchema, getIssueToolSchema, searchIssuesToolSchema, getMyIssuesToolSchema, manageIssueToolSchema, bulkCreateIssuesToolSchema, getTeamsAndProjectsToolSchema, getLabelsToolSchema, KNOWN_BASE_ACTIONS;
var init_tools = __esm(() => {
  init_client();
  init_config();
  init_formatters();
  authStatusToolSchema = {
    name: "linear_auth_status",
    description: "Check current active profile, workspace organization, and viewer info.",
    inputSchema: {
      type: "object",
      properties: {
        profileName: { type: "string", description: "Optional target profile/workspace for isolation" }
      }
    }
  };
  authListToolSchema = {
    name: "linear_auth_list",
    description: "List all saved Linear authentication profiles and workspaces.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["markdown", "compact_json"], default: "markdown" }
      }
    }
  };
  authSwitchToolSchema = {
    name: "linear_auth_switch",
    description: "Switch active authentication profile, workspace, or default team.",
    inputSchema: {
      type: "object",
      properties: {
        profileName: { type: "string", description: "Name of profile/workspace to activate (e.g. 'playzuzu', 'myrehat')" },
        teamKey: { type: "string", description: "Optional default team key to activate (e.g. 'ENG')" }
      }
    }
  };
  setApiKeyToolSchema = {
    name: "linear_set_api_key",
    description: "Add or set a long-lived Linear Personal API Key for a profile/workspace.",
    inputSchema: {
      type: "object",
      properties: {
        apiKey: { type: "string", description: "Linear Personal API Key (starts with 'lin_api_')" },
        profileName: { type: "string", description: "Optional profile/workspace name (e.g., 'playzuzu', 'myrehat'). Defaults to 'default'." },
        teamKey: { type: "string", description: "Optional default team key (e.g., 'ENG')" }
      },
      required: ["apiKey"]
    }
  };
  getIssueToolSchema = {
    name: "linear_get_issue",
    description: "Get detailed information for a Linear issue (e.g. ENG-123) with compact agent-optimized output.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Issue identifier (e.g., 'ENG-123') or UUID" },
        profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
        format: {
          type: "string",
          enum: ["markdown", "compact_json", "raw_json"],
          default: "markdown",
          description: "Output format: 'markdown' (compact card), 'compact_json' (minified JSON), 'raw_json' (raw API response)"
        }
      },
      required: ["id"]
    }
  };
  searchIssuesToolSchema = {
    name: "linear_search_issues",
    description: "Search Linear issues by keyword query, team, or status.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query or keyword" },
        profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
        teamKey: { type: "string", description: "Optional team key filter (e.g., 'ENG')" },
        limit: { type: "number", default: 15, description: "Maximum number of issues to return" },
        format: {
          type: "string",
          enum: ["markdown", "compact_json", "raw_json"],
          default: "markdown"
        }
      },
      required: ["query"]
    }
  };
  getMyIssuesToolSchema = {
    name: "linear_get_my_issues",
    description: "Get issues assigned to the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
        limit: { type: "number", default: 20 },
        format: {
          type: "string",
          enum: ["markdown", "compact_json", "raw_json"],
          default: "markdown"
        }
      }
    }
  };
  manageIssueToolSchema = {
    name: "linear_manage_issue",
    description: "Unified tool to create, update, comment, close, resolve, or bulk create Linear issues in a single action call.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "comment", "close", "resolve", "bulk_create"],
          description: "Action to perform"
        },
        profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
        issueId: { type: "string", description: "Issue identifier for 'update', 'comment', 'close', or 'resolve' (e.g. ENG-123)" },
        teamKey: { type: "string", description: "Team key for 'create' (e.g. ENG). Uses default team if omitted." },
        title: { type: "string", description: "Issue title for 'create' or 'update'" },
        description: { type: "string", description: "Description text" },
        priority: { type: "number", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" },
        assignee: { type: "string", description: "Assignee user ID, email, or name" },
        project: { type: "string", description: "Project name or ID" },
        estimate: { type: "number", description: "Story points estimate (1, 2, 3, 5, 8)" },
        dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Array of label names or IDs"
        },
        state: { type: "string", description: "Initial workflow state name or ID (e.g., 'Todo', 'In Progress')" },
        parentId: { type: "string", description: "Parent issue ID or identifier (e.g. 'ENG-100') for issue hierarchy" },
        blockedBy: {
          type: "array",
          items: { type: "string" },
          description: "Array of issue IDs or identifiers that block this issue (e.g. ['ENG-99'])"
        },
        blocks: {
          type: "array",
          items: { type: "string" },
          description: "Array of issue IDs or identifiers that this issue blocks (e.g. ['ENG-105'])"
        },
        commentBody: { type: "string", description: "Comment body text" },
        checkExisting: { type: "boolean", description: "If true, check if an issue with the same title exists in the team before creating" },
        idempotent: { type: "boolean", description: "If true, check if an issue with the same title exists in the team before creating (alias)" },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              team: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "number" },
              assignee: { type: "string" },
              project: { type: "string" },
              estimate: { type: "number" },
              dueDate: { type: "string" },
              labels: { type: "array", items: { type: "string" } },
              state: { type: "string" },
              parentId: { type: "string" },
              blockedBy: { type: "array", items: { type: "string" } },
              blocks: { type: "array", items: { type: "string" } }
            },
            required: ["title"]
          },
          description: "List of issue objects for action 'bulk_create'"
        },
        format: {
          type: "string",
          enum: ["markdown", "compact_json"],
          default: "markdown"
        }
      },
      required: ["action"]
    }
  };
  bulkCreateIssuesToolSchema = {
    name: "linear_bulk_create_issues",
    description: "Batch create multiple Linear issues in a single tool call for maximum agent execution speed.",
    inputSchema: {
      type: "object",
      properties: {
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              team: { type: "string", description: "Team key or ID (e.g. 'ENG')" },
              title: { type: "string", description: "Issue title" },
              description: { type: "string", description: "Description text" },
              priority: { type: "number", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" },
              assignee: { type: "string", description: "Assignee user ID, email, or name" },
              project: { type: "string", description: "Project name or ID" },
              estimate: { type: "number", description: "Story points estimate" },
              dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
              labels: { type: "array", items: { type: "string" }, description: "Labels" },
              state: { type: "string", description: "Workflow state name or ID" },
              parentId: { type: "string", description: "Parent issue ID or identifier" },
              blockedBy: { type: "array", items: { type: "string" }, description: "Blocking issue IDs/identifiers" },
              blocks: { type: "array", items: { type: "string" }, description: "Blocked issue IDs/identifiers" }
            },
            required: ["title"]
          },
          description: "List of issue objects to create"
        },
        defaultTeamKey: { type: "string", description: "Default team key if omitted in individual issue items" },
        checkExisting: { type: "boolean", description: "If true, skip creating duplicate issues with identical title in target team" },
        idempotent: { type: "boolean", description: "If true, skip creating duplicate issues with identical title in target team (alias)" },
        profileName: { type: "string", description: "Target workspace profile name" },
        format: {
          type: "string",
          enum: ["markdown", "compact_json"],
          default: "markdown"
        }
      },
      required: ["issues"]
    }
  };
  getTeamsAndProjectsToolSchema = {
    name: "linear_get_teams_and_projects",
    description: "Get list of available Linear teams and projects for the active workspace.",
    inputSchema: {
      type: "object",
      properties: {
        profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
        format: {
          type: "string",
          enum: ["markdown", "compact_json"],
          default: "markdown"
        }
      }
    }
  };
  getLabelsToolSchema = {
    name: "linear_get_labels",
    description: "Get list of available issue labels for the active workspace.",
    inputSchema: {
      type: "object",
      properties: {
        profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
        format: {
          type: "string",
          enum: ["markdown", "compact_json", "raw_json"],
          default: "markdown"
        }
      }
    }
  };
  KNOWN_BASE_ACTIONS = new Set([
    "auth_status",
    "auth_list",
    "auth_switch",
    "set_api_key",
    "get_issue",
    "search_issues",
    "get_my_issues",
    "manage_issue",
    "create_issue",
    "update_issue",
    "close_issue",
    "resolve_issue",
    "list_issues",
    "my_issues",
    "issue",
    "bulk_create_issues",
    "get_teams_and_projects",
    "get_labels"
  ]);
});

// src/index.ts
init_types();
init_config();
init_formatters();
init_client();
init_tools();
export {
  switchProfile,
  switchDefaultTeam,
  stripAnsi,
  setApiKeyToolSchema,
  searchIssuesToolSchema,
  saveProjectConfig,
  saveConfig,
  removeProfile,
  manageIssueToolSchema,
  loadConfig,
  listProfiles,
  handleToolCall,
  getTeamsAndProjectsToolSchema,
  getProjectConfig,
  getPriorityLabel,
  getMyIssuesToolSchema,
  getMcpToolSchemas,
  getLabelsToolSchema,
  getIssueToolSchema,
  getGitRemoteUrl,
  getAuthGuidanceMessage,
  getActiveProfile,
  generateGitBranchName,
  formatTeams,
  formatProjects,
  formatProfiles,
  formatLabels,
  formatIssueList,
  formatIssueDetail,
  formatActiveProfileBanner,
  detectTeamFromCwd,
  detectProfileFromGitRemote,
  cleanRawIssue,
  bulkCreateIssuesToolSchema,
  authSwitchToolSchema,
  authStatusToolSchema,
  authListToolSchema,
  addProfile,
  BelifoaSuggestionError,
  BelifoaClient
};
