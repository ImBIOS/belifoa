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
import { join } from "path";
import { homedir } from "os";
function loadConfig() {
  let fileConfig = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, "utf-8");
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
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
function getActiveProfile() {
  const config = loadConfig();
  const envKey = process.env.BELIFOA_API_KEY || process.env.LINEAR_API_KEY;
  const envProfileName = process.env.BELIFOA_PROFILE;
  if (envProfileName && config.profiles[envProfileName]) {
    const profile = { ...config.profiles[envProfileName] };
    if (envKey)
      profile.apiKey = envKey;
    if (process.env.BELIFOA_DEFAULT_TEAM)
      profile.defaultTeam = process.env.BELIFOA_DEFAULT_TEAM;
    return profile;
  }
  if (envKey) {
    return {
      name: "env",
      apiKey: envKey,
      defaultTeam: process.env.BELIFOA_DEFAULT_TEAM
    };
  }
  const activeName = config.activeProfile || "default";
  return config.profiles[activeName] || null;
}
function addProfile(name, apiKey, organization, defaultTeam) {
  const config = loadConfig();
  const profile = {
    name,
    apiKey,
    organization,
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
var CONFIG_DIR, CONFIG_FILE;
var init_config = __esm(() => {
  CONFIG_DIR = join(homedir(), ".config", "belifoa");
  CONFIG_FILE = join(CONFIG_DIR, "config.json");
});

// src/core/formatters.ts
function getPriorityLabel(priority) {
  return PRIORITY_LABELS[priority] || "None";
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
function formatIssueList(issues, format = "markdown") {
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
  const rows = issues.map((i) => {
    const assigneeStr = i.assignee ? `@${i.assignee}` : "-";
    const labelsStr = i.labels && i.labels.length > 0 ? `\`${i.labels.join(",")}\`` : "-";
    return `| [${i.identifier}](${i.url || ""}) | ${i.title.replace(/\|/g, "\\|")} | **${i.status}** | ${i.priorityLabel} | ${assigneeStr} | ${labelsStr} |`;
  });
  return [
    `Found ${issues.length} issue(s):`,
    "",
    "| ID | Title | Status | Priority | Assignee | Labels |",
    "|---|---|---|---|---|---|",
    ...rows
  ].join(`
`);
}
function formatIssueDetail(issue, format = "markdown") {
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
  const lines = [
    `# [${issue.identifier}] ${issue.title}`,
    "",
    `- **Status**: ${issue.status}`,
    `- **Priority**: ${issue.priorityLabel}`,
    `- **Assignee**: ${issue.assignee ? `@${issue.assignee}` : "Unassigned"}`,
    `- **Team**: ${issue.teamKey || "N/A"}`
  ];
  if (issue.project)
    lines.push(`- **Project**: ${issue.project}`);
  if (issue.labels && issue.labels.length > 0)
    lines.push(`- **Labels**: ${issue.labels.join(", ")}`);
  if (issue.url)
    lines.push(`- **URL**: ${issue.url}`);
  if (issue.description) {
    lines.push("", "## Description", "", issue.description);
  }
  if (issue.comments && issue.comments.length > 0) {
    lines.push("", `## Comments (${issue.comments.length})`, "");
    issue.comments.forEach((c) => {
      const authorStr = c.user?.name ? `@${c.user.name}` : "User";
      lines.push(`> **${authorStr}** (${c.createdAt}):`, `> ${c.body.replace(/\n/g, `
> `)}`, "");
    });
  }
  return lines.join(`
`);
}
function formatTeams(teams, format = "markdown") {
  if (format === "raw_json")
    return JSON.stringify(teams, null, 2);
  if (format === "compact_json")
    return JSON.stringify(teams.map((t) => ({ key: t.key, name: t.name, id: t.id })));
  if (teams.length === 0)
    return "No teams found.";
  const rows = teams.map((t) => `| **${t.key}** | ${t.name} | \`${t.id}\` |`);
  return ["### Teams:", "", "| Key | Name | ID |", "|---|---|---|", ...rows].join(`
`);
}
function formatProjects(projects, format = "markdown") {
  if (format === "raw_json")
    return JSON.stringify(projects, null, 2);
  if (format === "compact_json")
    return JSON.stringify(projects.map((p) => ({ name: p.name, state: p.state, progress: p.progress ? `${Math.round(p.progress * 100)}%` : undefined })));
  if (projects.length === 0)
    return "No projects found.";
  const rows = projects.map((p) => {
    const progStr = p.progress !== undefined ? `${Math.round(p.progress * 100)}%` : "N/A";
    return `| ${p.name} | ${p.state || "Active"} | ${progStr} |`;
  });
  return ["### Projects:", "", "| Name | State | Progress |", "|---|---|---|", ...rows].join(`
`);
}
function formatProfiles(profiles, format = "markdown") {
  if (format === "raw_json")
    return JSON.stringify(profiles, null, 2);
  if (format === "compact_json") {
    return JSON.stringify(profiles.map(({ profile, isActive }) => ({
      profile: profile.name,
      org: profile.organization?.name || "N/A",
      active: isActive,
      defaultTeam: profile.defaultTeam || "N/A"
    })));
  }
  if (profiles.length === 0)
    return "No authentication profiles saved.";
  const rows = profiles.map(({ profile, isActive }) => {
    const activeMarker = isActive ? "\u2705 **Active**" : "-";
    const orgStr = profile.organization?.name ? `${profile.organization.name} (\`${profile.organization.urlKey}\`)` : "N/A";
    const keyMasked = profile.apiKey ? `${profile.apiKey.substring(0, 11)}...` : "N/A";
    return `| **${profile.name}** | ${orgStr} | \`${profile.defaultTeam || "None"}\` | \`${keyMasked}\` | ${activeMarker} |`;
  });
  return [
    "### \uD83D\uDD10 Saved Linear Authentication Profiles (Workspaces):",
    "",
    "| Profile | Workspace / Org | Default Team | API Key | Status |",
    "|---|---|---|---|---|",
    ...rows
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
  constructor(apiKey) {
    this.apiKey = apiKey || getActiveProfile()?.apiKey || "";
  }
  setApiKey(key) {
    this.apiKey = key;
  }
  getApiKey() {
    return this.apiKey || getActiveProfile()?.apiKey || "";
  }
  async graphql(query, variables = {}) {
    if (!this.apiKey) {
      this.apiKey = getActiveProfile()?.apiKey || "";
    }
    if (!this.apiKey) {
      throw new Error("Linear API Key is missing! Set LINEAR_API_KEY environment variable, run `bun x github:ImBIOS/belifoa#main auth set <key>`, or call `linear_set_api_key` tool.");
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
    const me = await this.getMe();
    const query = `
      query MyIssues($assigneeId: StringFilter!, $first: Int) {
        issues(filter: { assignee: { id: $assigneeId } }, first: $first, orderBy: updatedAt) {
          nodes {
            id
            identifier
            title
            description
            priority
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
      assigneeId: { eq: me.id },
      first: limit
    });
    return (data.issues?.nodes || []).map(cleanRawIssue);
  }
  async createIssue(params) {
    let teamId = params.teamIdOrKey;
    if (!params.teamIdOrKey.includes("-") && params.teamIdOrKey.length < 10) {
      const teams = await this.getTeams();
      const match = teams.find((t) => t.key.toUpperCase() === params.teamIdOrKey.toUpperCase());
      if (match)
        teamId = match.id;
    }
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
            url
            createdAt
            state { name }
            team { key }
            assignee { name email }
          }
        }
      }
    `;
    const input = {
      teamId,
      title: params.title,
      description: params.description,
      priority: params.priority ?? 0,
      assigneeId: params.assigneeId,
      stateId: params.stateId
    };
    const data = await this.graphql(mutation, { input });
    if (!data.issueCreate.success || !data.issueCreate.issue) {
      throw new Error("Failed to create Linear issue.");
    }
    return cleanRawIssue(data.issueCreate.issue);
  }
  async updateIssue(id, params) {
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
            url
            updatedAt
            state { name }
            team { key }
            assignee { name email }
          }
        }
      }
    `;
    const data = await this.graphql(mutation, {
      id,
      input: params
    });
    if (!data.issueUpdate.success || !data.issueUpdate.issue) {
      throw new Error(`Failed to update issue ${id}`);
    }
    return cleanRawIssue(data.issueUpdate.issue);
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
    "2. **Switch Profile**: If you already saved a profile, run `linear_auth_switch({ profileName: 'zuzu' })`.",
    "3. **CLI Setup**: Run `bun x github:ImBIOS/belifoa#main auth add <profile-name> <lin_api_...>` in your terminal.",
    "",
    "_To create a Personal API Key, go to Linear Settings -> Account -> API -> Personal API keys._"
  ].join(`
`);
}
async function handleToolCall(name, args, client) {
  const format = args.format || "markdown";
  try {
    switch (name) {
      case "linear_auth_status": {
        try {
          const active = getActiveProfile();
          const me = await client.getMe();
          const org = await client.getOrganization();
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
        const profile = addProfile(profileName, args.apiKey, org, args.teamKey);
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
        const issue = await client.getIssue(args.id);
        return { content: [{ type: "text", text: formatIssueDetail(issue, format) }] };
      }
      case "linear_search_issues": {
        const active = getActiveProfile();
        const teamKey = args.teamKey || active?.defaultTeam;
        const issues = await client.searchIssues(args.query, {
          teamKey,
          limit: args.limit
        });
        return { content: [{ type: "text", text: formatIssueList(issues, format) }] };
      }
      case "linear_get_my_issues": {
        const issues = await client.getMyIssues(args.limit || 20);
        return { content: [{ type: "text", text: formatIssueList(issues, format) }] };
      }
      case "linear_manage_issue": {
        const active = getActiveProfile();
        if (args.action === "create") {
          const team = args.teamKey || active?.defaultTeam;
          if (!team || !args.title) {
            throw new Error("teamKey and title are required when action is 'create'. (Set default team or pass teamKey)");
          }
          const created = await client.createIssue({
            teamIdOrKey: team,
            title: args.title,
            description: args.description,
            priority: args.priority
          });
          return { content: [{ type: "text", text: `\u2705 Created issue:

${formatIssueDetail(created, format)}` }] };
        }
        if (args.action === "update") {
          if (!args.issueId)
            throw new Error("issueId is required for 'update'.");
          const updated = await client.updateIssue(args.issueId, {
            title: args.title,
            description: args.description,
            priority: args.priority
          });
          return { content: [{ type: "text", text: `\u2705 Updated issue:

${formatIssueDetail(updated, format)}` }] };
        }
        if (args.action === "comment") {
          if (!args.issueId || !args.commentBody) {
            throw new Error("issueId and commentBody are required for 'comment'.");
          }
          const comment = await client.addComment(args.issueId, args.commentBody);
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
      case "linear_get_teams_and_projects": {
        const teams = await client.getTeams();
        const projects = await client.getProjects();
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
var authStatusToolSchema, authListToolSchema, authSwitchToolSchema, setApiKeyToolSchema, getIssueToolSchema, searchIssuesToolSchema, getMyIssuesToolSchema, manageIssueToolSchema, getTeamsAndProjectsToolSchema;
var init_tools = __esm(() => {
  init_client();
  init_config();
  init_formatters();
  authStatusToolSchema = {
    name: "linear_auth_status",
    description: "Check current active profile, workspace organization, and viewer info.",
    inputSchema: {
      type: "object",
      properties: {}
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
        profileName: { type: "string", description: "Name of profile/workspace to activate (e.g. 'zuzu', 'myrehat')" },
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
        profileName: { type: "string", description: "Optional profile/workspace name (e.g., 'zuzu', 'myrehat'). Defaults to 'default'." },
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
        issueId: { type: "string", description: "Issue identifier for 'update' or 'comment' (e.g. ENG-123)" },
        teamKey: { type: "string", description: "Team key for 'create' (e.g. ENG). Uses default team if omitted." },
        title: { type: "string", description: "Issue title for 'create' or 'update'" },
        description: { type: "string", description: "Description text" },
        priority: { type: "number", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" },
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
  getTeamsAndProjectsToolSchema = {
    name: "linear_get_teams_and_projects",
    description: "Get list of available Linear teams and projects for the active workspace.",
    inputSchema: {
      type: "object",
      properties: {
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
  saveConfig,
  removeProfile,
  manageIssueToolSchema,
  loadConfig,
  listProfiles,
  handleToolCall,
  getTeamsAndProjectsToolSchema,
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
  authSwitchToolSchema,
  authStatusToolSchema,
  authListToolSchema,
  addProfile,
  BelifoaClient
};
