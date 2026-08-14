import { BelifoaClient } from "../core/client.js";
import {
  listProfiles,
  switchProfile,
  switchDefaultTeam,
  addProfile,
  getActiveProfile,
} from "../core/config.js";
import {
  formatIssueDetail,
  formatIssueList,
  formatSearchResult,
  formatTeams,
  formatProjects,
  formatProfiles,
  formatLabels,
} from "../core/formatters.js";
import type { OutputFormat } from "../core/types.js";

export const authStatusToolSchema = {
  name: "belifoa_auth_status",
  description:
    "Check current active profile, all saved profiles, workspace organization, and viewer info. Pass profileName to inspect a different workspace.",
  inputSchema: {
    type: "object",
    properties: {
      profileName: {
        type: "string",
        description: "Optional target profile/workspace. Defaults to active profile.",
      },
    },
  },
};

export const authSwitchToolSchema = {
  name: "belifoa_auth_switch",
  description: "Switch active authentication profile, workspace, or default team.",
  inputSchema: {
    type: "object",
    properties: {
      profileName: {
        type: "string",
        description: "Name of profile/workspace to activate (e.g. 'playzuzu', 'myrehat')",
      },
      teamKey: { type: "string", description: "Optional default team key to activate (e.g. 'ENG')" },
    },
  },
};

export const setApiKeyToolSchema = {
  name: "belifoa_set_api_key",
  description: "Add or set a long-lived Linear Personal API Key for a profile/workspace.",
  inputSchema: {
    type: "object",
    properties: {
      apiKey: { type: "string", description: "Linear Personal API Key (starts with 'lin_api_')" },
      profileName: {
        type: "string",
        description: "Optional profile/workspace name (e.g., 'playzuzu', 'myrehat'). Defaults to 'default'.",
      },
      teamKey: { type: "string", description: "Optional default team key (e.g., 'ENG')" },
    },
    required: ["apiKey"],
  },
};

export const getIssueToolSchema = {
  name: "belifoa_get_issue",
  description:
    "Get detailed information for a Linear issue (e.g. ENG-123) with compact agent-optimized output.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Issue identifier (e.g., 'ENG-123') or UUID" },
      profileName: {
        type: "string",
        description: "Target workspace profile name for parallel agent isolation. Defaults to active profile.",
      },
      format: {
        type: "string",
        enum: ["markdown", "compact_json", "raw_json"],
        default: "markdown",
        description: "Output format: 'markdown' (compact card), 'compact_json' (minified JSON), 'raw_json' (raw API response)",
      },
    },
    required: ["id"],
  },
};

export const searchIssuesToolSchema = {
  name: "belifoa_search_issues",
  description:
    "Search Linear issues by keyword query, team, or status. Results are re-ranked by title/description/label/comment token overlap and each row shows which query tokens matched where (t:/d:/l:/c:). Supports cursor pagination via 'after'.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query or keyword" },
      profileName: {
        type: "string",
        description: "Target workspace profile name for parallel agent isolation. Defaults to active profile.",
      },
      teamKey: { type: "string", description: "Optional team key filter (e.g., 'ENG')" },
      limit: { type: "number", default: 15, description: "Maximum number of issues to return" },
      after: {
        type: "string",
        description: "Cursor from a previous result's 'endCursor' to fetch the next page",
      },
      format: {
        type: "string",
        enum: ["markdown", "compact_json", "raw_json"],
        default: "markdown",
      },
    },
    required: ["query"],
  },
};

export const getMyIssuesToolSchema = {
  name: "belifoa_get_my_issues",
  description:
    "Get issues assigned to the authenticated user. Supports cursor pagination via 'after'.",
  inputSchema: {
    type: "object",
    properties: {
      profileName: {
        type: "string",
        description: "Target workspace profile name for parallel agent isolation. Defaults to active profile.",
      },
      limit: { type: "number", default: 20 },
      after: {
        type: "string",
        description: "Cursor from a previous result's 'endCursor' to fetch the next page",
      },
      format: {
        type: "string",
        enum: ["markdown", "compact_json", "raw_json"],
        default: "markdown",
      },
    },
  },
};

export const manageIssueToolSchema = {
  name: "belifoa_manage_issue",
  description:
    "Unified tool to create, update, comment, close, resolve, or bulk create Linear issues in a single action call.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "update", "comment", "close", "resolve", "delete_comment", "archive_comment", "bulk_create"],
        description: "Action to perform",
      },
      profileName: {
        type: "string",
        description: "Target workspace profile name for parallel agent isolation. Defaults to active profile.",
      },
      issueId: { type: "string", description: "Issue identifier for 'update', 'comment', 'close', or 'resolve' (e.g. ENG-123)" },
      commentId: { type: "string", description: "Comment ID for 'delete_comment' or 'archive_comment' (get it from get_issue output or comments)" },
      teamKey: { type: "string", description: "Team key for 'create' (e.g. ENG). Uses default team if omitted." },
      title: { type: "string", description: "Issue title for 'create' or 'update'" },
      description: { type: "string", description: "Description text" },
      priority: { type: "number", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" },
      assignee: { type: "string", description: "Assignee user ID, email, or name" },
      project: { type: "string", description: "Project name or ID" },
      estimate: { type: "number", enum: [1, 2, 3, 5, 8], description: "Story points estimate (1, 2, 3, 5, 8)" },
      dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Array of label names or IDs",
      },
      state: { type: "string", description: "Initial workflow state name or ID (e.g., 'Todo', 'In Progress')" },
      parentId: { type: "string", description: "Parent issue ID or identifier (e.g. 'ENG-100') for issue hierarchy" },
      blockedBy: {
        type: "array",
        items: { type: "string" },
        description: "Array of issue IDs or identifiers that block this issue (e.g. ['ENG-99'])",
      },
      blocks: {
        type: "array",
        items: { type: "string" },
        description: "Array of issue IDs or identifiers that this issue blocks (e.g. ['ENG-105'])",
      },
      commentBody: { type: "string", description: "Comment body text for 'comment', 'close', 'resolve', or 'update'" },
      clientId: {
        type: "string",
        description:
          "Stable id for retry idempotency. Pass the same clientId when retrying a failed 'create' or 'comment' call so Linear dedupes it instead of duplicating the issue/comment.",
      },
      checkExisting: {
        type: "boolean",
        description: "If true, check if an issue with the same title exists in the team before creating",
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            team: { type: "string", description: "Team key or ID (e.g. 'ENG'). Falls back to action teamKey." },
            title: { type: "string", description: "Issue title" },
            description: { type: "string", description: "Description text" },
            priority: { type: "number", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" },
            assignee: { type: "string", description: "Assignee user ID, email, or name" },
            project: { type: "string", description: "Project name or ID" },
            estimate: { type: "number", enum: [1, 2, 3, 5, 8], description: "Story points estimate (1, 2, 3, 5, 8)" },
            dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
            labels: { type: "array", items: { type: "string" }, description: "Array of label names or IDs" },
            state: { type: "string", description: "Initial workflow state name or ID" },
            parentId: { type: "string", description: "Parent issue ID or identifier" },
            blockedBy: { type: "array", items: { type: "string" }, description: "Blocking issue IDs/identifiers" },
            blocks: { type: "array", items: { type: "string" }, description: "Blocked issue IDs/identifiers" },
            clientId: { type: "string", description: "Stable id for retry idempotency (Linear dedupes creates with the same clientId)" },
          },
          required: ["title"],
        },
        description: "List of issue objects for action 'bulk_create'",
      },
      format: {
        type: "string",
        enum: ["markdown", "compact_json"],
        default: "markdown",
      },
    },
    required: ["action"],
  },
};

export const getWorkspaceToolSchema = {
  name: "belifoa_get_workspace",
  description: "Get teams, projects, and issue labels available in the workspace.",
  inputSchema: {
    type: "object",
    properties: {
      profileName: {
        type: "string",
        description: "Target workspace profile name for parallel agent isolation. Defaults to active profile.",
      },
      format: {
        type: "string",
        enum: ["markdown", "compact_json"],
        default: "markdown",
      },
    },
  },
};

export function getMcpToolSchemas(): Array<{ name: string; description: string; inputSchema: any }> {
  return [
    authStatusToolSchema,
    authSwitchToolSchema,
    setApiKeyToolSchema,
    getIssueToolSchema,
    searchIssuesToolSchema,
    getMyIssuesToolSchema,
    manageIssueToolSchema,
    getWorkspaceToolSchema,
  ];
}

export function getAuthGuidanceMessage(): string {
  const profiles = listProfiles();
  const profileListStr = profiles.length > 0
    ? `Saved Profiles: ${profiles.map((p) => p.profile.name + (p.isActive ? " (Active)" : "")).join(", ")}`
    : "No profiles saved yet.";

  return [
    "🔒 **Linear Authentication Required**",
    "",
    "**Instructions for AI Agent**:",
    "Linear authentication is currently missing or invalid.",
    "Please inform the user interactively in chat that they need to provide a Linear Personal API Key.",
    "",
    `_Current Status_: ${profileListStr}`,
    "",
    "**Options for User**:",
    "1. **Provide Key in Chat**: Paste your Personal API Key (starts with `lin_api_`) here, and I will save it using `belifoa_set_api_key`.",
    "2. **Switch Profile**: If you already saved a profile, run `belifoa_auth_switch({ profileName: 'playzuzu' })`.",
    "3. **CLI Setup**: Run `bun x github:ImBIOS/belifoa#canary auth add <profile-name> <lin_api_...>` in your terminal.",
    "",
    "_To create a Personal API Key, go to Linear Settings -> Account -> API -> Personal API keys._",
  ].join("\n");
}

const KNOWN_BASE_ACTIONS = new Set([
  "auth_status",
  "auth_list",
  "auth_switch",
  "set_api_key",
  "get_issue",
  "search_issues",
  "get_my_issues",
  "manage_issue",
  "get_workspace",
  "create_issue",
  "update_issue",
  "close_issue",
  "resolve_issue",
  "list_issues",
  "my_issues",
  "issue",
  "bulk_create_issues",
  "get_teams_and_projects",
  "get_labels",
]);

export async function handleToolCall(
  name: string,
  args: any,
  client: BelifoaClient
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const format: OutputFormat = args.format || "markdown";

  let cleanName = name;
  let prefixProfile: string | undefined = undefined;

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
  const targetClient =
    args.profileName && args.profileName !== client.getProfileName() && client.getProfileName() !== undefined
      ? new BelifoaClient(undefined, args.profileName)
      : client;

  // Legacy tool names normalization (kept for backward compatibility with
  // previously pinned MCP configs; all map onto the unified tool set)
  if (cleanName === "create_issue") {
    args.action = "create";
    cleanName = "manage_issue";
  } else if (cleanName === "update_issue") {
    args.action = "update";
    cleanName = "manage_issue";
  } else if (cleanName === "close_issue" || cleanName === "resolve_issue") {
    args.action = "close";
    cleanName = "manage_issue";
  } else if (cleanName === "bulk_create_issues") {
    args.action = "bulk_create";
    if (args.defaultTeamKey && !args.teamKey) args.teamKey = args.defaultTeamKey;
    cleanName = "manage_issue";
  } else if (cleanName === "list_issues" || cleanName === "my_issues") {
    cleanName = args.query ? "search_issues" : "get_my_issues";
  } else if (cleanName === "issue") {
    cleanName = "get_issue";
  } else if (cleanName === "get_teams_and_projects" || cleanName === "get_labels") {
    cleanName = "get_workspace";
  }

  try {
    switch (cleanName) {
      case "auth_status": {
        try {
          const me = await targetClient.getMe();
          const org = await targetClient.getOrganization();
          const profiles = listProfiles();
          const savedStr = profiles.length > 0
            ? profiles.map((p) => p.profile.name + (p.isActive ? " (Active)" : "")).join(", ")
            : "None";
          return {
            content: [
              {
                type: "text",
                text: [
                  `✅ **Active Profile**: \`${active?.name || "default"}\``,
                  `- **Workspace / Org**: ${org.name} (\`${org.urlKey}\`)`,
                  `- **User**: ${me.name} (${me.email || me.id})`,
                  `- **Default Team**: ${active?.defaultTeam || "None"}`,
                  `- **Saved Profiles**: ${savedStr}`,
                ].join("\n"),
              },
            ],
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
        let msgParts: string[] = [];
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
              text: `✅ ${msgParts.join(" and ")}.\nWorkspace: **${org.name}** (\`${org.urlKey}\`)`,
            },
          ],
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

        const profile = addProfile(
          profileName,
          args.apiKey,
          org,
          args.teamKey,
          teams.map((t) => ({ key: t.key, name: t.name }))
        );
        client.setApiKey(args.apiKey);

        return {
          content: [
            {
              type: "text",
              text: [
                `✅ Saved & activated Linear API Key for profile **'${profile.name}'**!`,
                `- **Workspace / Org**: ${org.name} (\`${org.urlKey}\`)`,
                `- **User**: ${me.name} (${me.email || me.id})`,
                `- **Default Team**: ${profile.defaultTeam || "None"}`,
              ].join("\n"),
            },
          ],
        };
      }

      case "get_issue": {
        const issue = await targetClient.getIssue(args.id);
        return { content: [{ type: "text", text: formatIssueDetail(issue, format, active) }] };
      }

      case "search_issues": {
        const teamKey = args.teamKey || active?.defaultTeam;
        const page = await targetClient.searchIssuesPage(args.query || "", {
          teamKey,
          limit: args.limit,
          after: args.after,
        });
        return { content: [{ type: "text", text: formatSearchResult(page.issues, format, { hasNextPage: page.hasNextPage, endCursor: page.endCursor }, active) }] };
      }

      case "get_my_issues": {
        const page = await targetClient.getMyIssuesPage(args.limit || 20, { after: args.after });
        return { content: [{ type: "text", text: formatSearchResult(page.issues, format, { hasNextPage: page.hasNextPage, endCursor: page.endCursor }, active) }] };
      }

      case "manage_issue": {
        if (args.action === "bulk_create") {
          const defaultTeam = args.teamKey || active?.defaultTeam;
          const checkExisting = Boolean(args.checkExisting || args.idempotent);
          const items = (args.issues || []).map((i: any) => ({
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
            blocks: i.blocks,
            clientId: i.clientId,
          }));

          const result = await targetClient.createBulkIssues(items, defaultTeam, checkExisting);
          const parts: string[] = [];
          if (result.created.length > 0) {
            parts.push(`✅ Created ${result.created.length} issue(s):\n\n${formatIssueList(result.created, format, active)}`);
          }
          if (result.errors.length > 0) {
            parts.push(
              `⚠️ Failed to create ${result.errors.length} issue(s):\n${result.errors
                .map((e) => `- Item #${e.index + 1} "${e.title}": ${e.error}`)
                .join("\n")}`
            );
          }
          return { content: [{ type: "text", text: parts.join("\n\n") }] };
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
            checkExisting: Boolean(args.checkExisting || args.idempotent),
            clientId: args.clientId,
          });
          return { content: [{ type: "text", text: `✅ Created issue:\n\n${formatIssueDetail(created, format, active)}` }] };
        }

        if (args.action === "update") {
          if (!args.issueId) throw new Error("issueId is required for 'update'.");
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
            blocks: args.blocks,
          });
          if (args.commentBody) {
            await targetClient.addComment(args.issueId, args.commentBody, args.clientId);
            const refreshed = await targetClient.getIssue(args.issueId).catch(() => updated);
            return { content: [{ type: "text", text: `✅ Updated issue:\n\n${formatIssueDetail(refreshed, format, active)}` }] };
          }
          return { content: [{ type: "text", text: `✅ Updated issue:\n\n${formatIssueDetail(updated, format, active)}` }] };
        }

        if (args.action === "close" || args.action === "resolve") {
          if (!args.issueId) throw new Error("issueId is required for 'close' or 'resolve'.");
          const updated = await targetClient.updateIssue(args.issueId, { state: "Done" });
          if (args.commentBody) {
            await targetClient.addComment(args.issueId, args.commentBody, args.clientId);
          }
          const refreshed = args.commentBody ? await targetClient.getIssue(args.issueId).catch(() => updated) : updated;
          return { content: [{ type: "text", text: `✅ Closed/Resolved issue ${args.issueId}:\n\n${formatIssueDetail(refreshed, format, active)}` }] };
        }

        if (args.action === "comment") {
          if (!args.issueId || !args.commentBody) {
            throw new Error("issueId and commentBody are required for 'comment'.");
          }
          const comment = await targetClient.addComment(args.issueId, args.commentBody, args.clientId);
          return {
            content: [
              {
                type: "text",
                text: `✅ Added comment to ${args.issueId}:\n> ${comment.body}`,
              },
            ],
          };
        }

        if (args.action === "delete_comment" || args.action === "archive_comment") {
          if (!args.commentId) {
            throw new Error(`commentId is required for '${args.action}'.`);
          }
          const result =
            args.action === "delete_comment"
              ? await targetClient.deleteComment(args.commentId)
              : await targetClient.archiveComment(args.commentId);
          return {
            content: [
              {
                type: "text",
                text: `✅ ${args.action === "delete_comment" ? "Deleted" : "Archived"} comment ${result.id}`,
              },
            ],
          };
        }

        throw new Error(`Unsupported action: ${args.action}`);
      }

      case "get_workspace": {
        const teams = await targetClient.getTeams();
        const projects = await targetClient.getProjects();
        const labels = await targetClient.getIssueLabels();
        const text = [
          formatTeams(teams, format, active),
          "",
          formatProjects(projects, format, active),
          "",
          formatLabels(labels, format, active),
        ].join("\n");
        return { content: [{ type: "text", text }] };
      }

      default:
        throw new Error(`Unknown tool name: ${name}`);
    }
  } catch (err: any) {
    if (err.suggestions) {
      return { content: [{ type: "text", text: JSON.stringify(err.suggestions, null, 2) }] };
    }
    if (
      err.message?.includes("Linear API Key is missing") ||
      err.message?.includes("Authentication failed") ||
      err.message?.includes("401")
    ) {
      return { content: [{ type: "text", text: getAuthGuidanceMessage() }] };
    }
    throw err;
  }
}