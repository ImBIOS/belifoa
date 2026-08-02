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

// src/core/config.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
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
  writeFileSync(configFile, JSON.stringify(config, null, 2), "utf-8");
}
function getProjectConfig(startDir = process.cwd()) {
  let currentDir = startDir;
  while (true) {
    const jsonFile = join(currentDir, ".belifoarc.json");
    if (existsSync(jsonFile)) {
      try {
        const content = readFileSync(jsonFile, "utf-8");
        return JSON.parse(content);
      } catch {}
    }
    const dotFile = join(currentDir, ".belifoa");
    if (existsSync(dotFile)) {
      try {
        const content = readFileSync(dotFile, "utf-8");
        return JSON.parse(content);
      } catch {}
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir)
      break;
    currentDir = parentDir;
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
  const targetName = overrideProfileName || process.env.BELIFOA_PROFILE || getProjectConfig()?.profile;
  if (targetName && config.profiles[targetName]) {
    const profile = { ...config.profiles[targetName] };
    if (envKey)
      profile.apiKey = envKey;
    const projectConfig = getProjectConfig();
    if (envTeam || projectConfig?.team) {
      profile.defaultTeam = envTeam || projectConfig?.team;
    }
    return profile;
  }
  if (envKey) {
    return {
      name: "env",
      apiKey: envKey,
      defaultTeam: envTeam || getProjectConfig()?.team
    };
  }
  const activeName = config.activeProfile || "default";
  return config.profiles[activeName] || null;
}
function addProfile(name, apiKey, organization, defaultTeam, teams) {
  const config = loadConfig();
  const profile = {
    name,
    apiKey,
    organization,
    teams: teams || config.profiles[name]?.teams,
    defaultTeam: defaultTeam || config.profiles[name]?.defaultTeam,
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
  const targetName = profileName || config.activeProfile || "default";
  if (!config.profiles[targetName]) {
    throw new Error(`Auth profile '${targetName}' not found.`);
  }
  config.profiles[targetName].defaultTeam = teamKey.toUpperCase();
  saveConfig(config);
  return config.profiles[targetName];
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
function pad(str, length) {
  return (str + " ".repeat(length)).substring(0, length);
}
function cleanRawIssue(node) {
  const priority = node.priority ?? 0;
  return {
    id: node.id,
    identifier: node.identifier,
    title: node.title,
    description: node.description ?? undefined,
    priority,
    priorityLabel: getPriorityLabel(priority),
    status: node.state?.name || node.status || "Unknown",
    teamKey: node.team?.key,
    assignee: node.assignee?.name || node.assignee?.email,
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
    })) : undefined
  };
}
function formatIssueList(issues, format = "cli_table") {
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
  if (issues.length === 0) {
    return "No issues found.";
  }
  if (format === "markdown") {
    const rows2 = issues.map((i) => {
      const assigneeStr = i.assignee ? `@${i.assignee}` : "-";
      const labelsStr = i.labels && i.labels.length > 0 ? `\`${i.labels.join(",")}\`` : "-";
      return `| [${i.identifier}](${i.url || ""}) | ${i.title.replace(/\|/g, "\\|")} | **${i.status}** | ${i.priorityLabel} | ${assigneeStr} | ${labelsStr} |`;
    });
    return [
      `Found ${issues.length} issue(s):`,
      "",
      "| ID | Title | Status | Priority | Assignee | Labels |",
      "|---|---|---|---|---|---|",
      ...rows2
    ].join(`
`);
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
  return [
    `\x1B[1mFound ${issues.length} issue(s):\x1B[0m`,
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body
  ].join(`
`);
}
function formatIssueDetail(issue, format = "cli_table") {
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
  if (format === "markdown") {
    const lines2 = [
      `# [${issue.identifier}] ${issue.title}`,
      "",
      `- **Status**: ${issue.status}`,
      `- **Priority**: ${issue.priorityLabel}`,
      `- **Assignee**: ${issue.assignee ? `@${issue.assignee}` : "Unassigned"}`,
      `- **Team**: ${issue.teamKey || "N/A"}`
    ];
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
    return lines2.join(`
`);
  }
  const lines = [
    `\x1B[1m\x1B[36m[${issue.identifier}]\x1B[0m \x1B[1m${issue.title}\x1B[0m`,
    `\x1B[2m${"\u2500".repeat(60)}\x1B[0m`,
    `  \x1B[1mStatus\x1B[0m:    \x1B[32m${issue.status}\x1B[0m`,
    `  \x1B[1mPriority\x1B[0m:  ${issue.priorityLabel}`,
    `  \x1B[1mAssignee\x1B[0m:  ${issue.assignee ? `@${issue.assignee}` : "Unassigned"}`,
    `  \x1B[1mTeam\x1B[0m:      ${issue.teamKey || "N/A"}`
  ];
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
  return lines.join(`
`);
}
function formatTeams(teams, format = "cli_table") {
  if (format === "raw_json")
    return JSON.stringify(teams, null, 2);
  if (format === "compact_json")
    return JSON.stringify(teams.map((t) => ({ key: t.key, name: t.name, id: t.id })));
  if (teams.length === 0)
    return "No teams found.";
  if (format === "markdown") {
    const rows = teams.map((t) => `| **${t.key}** | ${t.name} | \`${t.id}\` |`);
    return ["### Teams:", "", "| Key | Name | ID |", "|---|---|---|", ...rows].join(`
`);
  }
  const maxKey = Math.max(6, ...teams.map((t) => t.key.length));
  const maxName = Math.max(20, ...teams.map((t) => t.name.length));
  const maxId = Math.max(10, ...teams.map((t) => t.id.length));
  const header = `  ${pad("KEY", maxKey)}  ${pad("NAME", maxName)}  ${pad("ID", maxId)}`;
  const divider = `  ${"\u2500".repeat(maxKey)}  ${"\u2500".repeat(maxName)}  ${"\u2500".repeat(maxId)}`;
  const body = teams.map((t) => `  \x1B[1m\x1B[36m${pad(t.key, maxKey)}\x1B[0m  ${pad(t.name, maxName)}  \x1B[2m${pad(t.id, maxId)}\x1B[0m`);
  return [
    `\x1B[1m\uD83D\uDC65 Linear Teams:\x1B[0m`,
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body
  ].join(`
`);
}
function formatProjects(projects, format = "cli_table") {
  if (format === "raw_json")
    return JSON.stringify(projects, null, 2);
  if (format === "compact_json")
    return JSON.stringify(projects.map((p) => ({ name: p.name, state: p.state, progress: p.progress ? `${Math.round(p.progress * 100)}%` : undefined })));
  if (projects.length === 0)
    return "No projects found.";
  if (format === "markdown") {
    const rows2 = projects.map((p) => {
      const progStr = p.progress !== undefined ? `${Math.round(p.progress * 100)}%` : "N/A";
      return `| ${p.name} | ${p.state || "Active"} | ${progStr} |`;
    });
    return ["### Projects:", "", "| Name | State | Progress |", "|---|---|---|", ...rows2].join(`
`);
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
  return [
    `\x1B[1m\uD83D\uDCC1 Linear Projects:\x1B[0m`,
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body
  ].join(`
`);
}
function formatProfiles(profiles, format = "cli_table") {
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
  if (profiles.length === 0)
    return "\u274C No authentication profiles saved.";
  if (format === "markdown") {
    const rows2 = profiles.map(({ profile, isActive }) => {
      const activeMarker = isActive ? "\u2705 **Active**" : "-";
      const orgStr = profile.organization?.name ? `${profile.organization.name} (\`${profile.organization.urlKey}\`)` : "N/A";
      const teamsStr = profile.teams && profile.teams.length > 0 ? profile.teams.map((t) => `\`${t.key}\``).join(", ") : "All Teams";
      const keyMasked = profile.apiKey ? `${profile.apiKey.substring(0, 11)}...` : "N/A";
      return `| **${profile.name}** | ${orgStr} | ${teamsStr} | \`${profile.defaultTeam || "None"}\` | \`${keyMasked}\` | ${activeMarker} |`;
    });
    return [
      "### \uD83D\uDD10 Saved Linear Authentication Profiles (Workspaces):",
      "",
      "| Profile | Workspace / Org | Accessible Teams | Default Team | API Key | Status |",
      "|---|---|---|---|---|---|",
      ...rows2
    ].join(`
`);
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
  return [
    "\x1B[1m\x1B[36m\uD83D\uDD10 Saved Linear Authentication Profiles (Workspaces):\x1B[0m",
    "",
    `\x1B[1m${header}\x1B[0m`,
    `\x1B[2m${divider}\x1B[0m`,
    ...body,
    ""
  ].join(`
`);
}
var PRIORITY_LABELS;
var init_formatters = __esm(() => {
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
  async resolveUserId(assigneeStr) {
    if (!assigneeStr)
      return;
    if (assigneeStr.includes("-") && assigneeStr.length > 20)
      return assigneeStr;
    const users = await this.getUsers();
    const cleanStr = assigneeStr.replace(/^@/, "").toLowerCase();
    const match = users.find((u) => u.id === assigneeStr || u.email?.toLowerCase() === cleanStr || u.name.toLowerCase() === cleanStr || u.name.toLowerCase().includes(cleanStr));
    return match?.id;
  }
  async resolveProjectId(projectStr) {
    if (!projectStr)
      return;
    if (projectStr.includes("-") && projectStr.length > 20)
      return projectStr;
    const projects = await this.getProjects();
    const cleanStr = projectStr.toLowerCase();
    const match = projects.find((p) => p.id === projectStr || p.name.toLowerCase() === cleanStr || p.name.toLowerCase().includes(cleanStr));
    return match?.id;
  }
  async resolveStateId(teamId, stateStr) {
    if (!stateStr)
      return;
    if (stateStr.includes("-") && stateStr.length > 20)
      return stateStr;
    const states = await this.getTeamStates(teamId);
    const cleanStr = stateStr.toLowerCase();
    const match = states.find((s) => s.id === stateStr || s.name.toLowerCase() === cleanStr || s.type.toLowerCase() === cleanStr);
    return match?.id;
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
    const query = `
      query SearchIssues($term: String!, $first: Int) {
        issueSearch(query: $term, first: $first) {
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
          }
        }
      }
    `;
    const data = await this.graphql(query, {
      term: queryStr,
      first: limit
    });
    let nodes = data.issueSearch.nodes || [];
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
    let teamId = params.teamIdOrKey;
    if (!params.teamIdOrKey.includes("-") || params.teamIdOrKey.length < 10) {
      const teams = await this.getTeams();
      const match = teams.find((t) => t.key.toUpperCase() === params.teamIdOrKey.toUpperCase() || t.id === params.teamIdOrKey);
      if (match)
        teamId = match.id;
    }
    const assigneeId = params.assignee ? await this.resolveUserId(params.assignee) : undefined;
    const projectId = params.project ? await this.resolveProjectId(params.project) : undefined;
    const stateId = params.state ? await this.resolveStateId(teamId, params.state) : undefined;
    const labelIds = params.labels ? await this.resolveLabelIds(params.labels) : undefined;
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
      labelIds
    };
    Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);
    const data = await this.graphql(mutation, { input });
    if (!data.issueCreate.success || !data.issueCreate.issue) {
      throw new Error("Failed to create Linear issue.");
    }
    return cleanRawIssue(data.issueCreate.issue);
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
      labelIds
    };
    Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);
    const data = await this.graphql(mutation, {
      id: existing?.id || id,
      input
    });
    if (!data.issueUpdate.success || !data.issueUpdate.issue) {
      throw new Error(`Failed to update issue ${id}`);
    }
    return cleanRawIssue(data.issueUpdate.issue);
  }
  async createBulkIssues(issues, defaultTeam) {
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
          teamIdOrKey: teamKey
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
});

// src/mcp/tools.ts
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
  const targetClient = args.profileName ? new BelifoaClient(undefined, args.profileName) : client;
  try {
    switch (name) {
      case "linear_auth_status": {
        try {
          const active = getActiveProfile(args.profileName);
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
      case "linear_auth_list": {
        const profiles = listProfiles();
        return { content: [{ type: "text", text: formatProfiles(profiles, format) }] };
      }
      case "linear_auth_switch": {
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
      case "linear_set_api_key": {
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
      case "linear_get_issue": {
        const issue = await targetClient.getIssue(args.id);
        return { content: [{ type: "text", text: formatIssueDetail(issue, format) }] };
      }
      case "linear_search_issues": {
        const active = getActiveProfile(args.profileName);
        const teamKey = args.teamKey || active?.defaultTeam;
        const issues = await targetClient.searchIssues(args.query, {
          teamKey,
          limit: args.limit
        });
        return { content: [{ type: "text", text: formatIssueList(issues, format) }] };
      }
      case "linear_get_my_issues": {
        const issues = await targetClient.getMyIssues(args.limit || 20);
        return { content: [{ type: "text", text: formatIssueList(issues, format) }] };
      }
      case "linear_manage_issue": {
        const active = getActiveProfile(args.profileName);
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
            assignee: args.assignee,
            project: args.project,
            estimate: args.estimate,
            dueDate: args.dueDate,
            labels: args.labels,
            state: args.state
          });
          return { content: [{ type: "text", text: `\u2705 Created issue:

${formatIssueDetail(created, format)}` }] };
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
            state: args.state
          });
          return { content: [{ type: "text", text: `\u2705 Updated issue:

${formatIssueDetail(updated, format)}` }] };
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
      case "linear_bulk_create_issues": {
        const active = getActiveProfile(args.profileName);
        const defaultTeam = args.defaultTeamKey || active?.defaultTeam;
        const items = (args.issues || []).map((i) => ({
          teamIdOrKey: i.team || defaultTeam,
          title: i.title,
          description: i.description,
          priority: i.priority,
          assignee: i.assignee,
          project: i.project,
          estimate: i.estimate,
          dueDate: i.dueDate,
          labels: i.labels,
          state: i.state
        }));
        const result = await targetClient.createBulkIssues(items, defaultTeam);
        const parts = [];
        if (result.created.length > 0) {
          parts.push(`\u2705 Created ${result.created.length} issue(s):

${formatIssueList(result.created, format)}`);
        }
        if (result.errors.length > 0) {
          parts.push(`\u26A0\uFE0F Failed to create ${result.errors.length} issue(s):
${result.errors.map((e) => `- Item #${e.index + 1} "${e.title}": ${e.error}`).join(`
`)}`);
        }
        return { content: [{ type: "text", text: parts.join(`

`) }] };
      }
      case "linear_get_teams_and_projects": {
        const teams = await targetClient.getTeams();
        const projects = await targetClient.getProjects();
        const text = [formatTeams(teams, format), "", formatProjects(projects, format)].join(`
`);
        return { content: [{ type: "text", text }] };
      }
      default:
        throw new Error(`Unknown tool name: ${name}`);
    }
  } catch (err) {
    if (err.message?.includes("Linear API Key is missing") || err.message?.includes("Authentication failed") || err.message?.includes("401")) {
      return { content: [{ type: "text", text: getAuthGuidanceMessage() }] };
    }
    throw err;
  }
}
var authStatusToolSchema, authListToolSchema, authSwitchToolSchema, setApiKeyToolSchema, getIssueToolSchema, searchIssuesToolSchema, getMyIssuesToolSchema, manageIssueToolSchema, bulkCreateIssuesToolSchema, getTeamsAndProjectsToolSchema;
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
    description: "Unified tool to create, update, or add comments to a Linear issue in a single action call.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "comment"],
          description: "Action to perform"
        },
        profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
        issueId: { type: "string", description: "Issue identifier for 'update' or 'comment' (e.g. ENG-123)" },
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
        commentBody: { type: "string", description: "Comment body text" },
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
              state: { type: "string", description: "Workflow state name or ID" }
            },
            required: ["title"]
          },
          description: "List of issue objects to create"
        },
        defaultTeamKey: { type: "string", description: "Default team key if omitted in individual issue items" },
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
});

// src/index.ts
init_config();
init_formatters();
init_client();
init_tools();
export {
  switchProfile,
  switchDefaultTeam,
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
  getIssueToolSchema,
  getAuthGuidanceMessage,
  getActiveProfile,
  formatTeams,
  formatProjects,
  formatProfiles,
  formatIssueList,
  formatIssueDetail,
  cleanRawIssue,
  bulkCreateIssuesToolSchema,
  authSwitchToolSchema,
  authStatusToolSchema,
  authListToolSchema,
  addProfile,
  BelifoaClient
};
