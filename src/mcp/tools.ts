import { z } from "zod";
import { BelifoaClient } from "../core/client.js";
import {
  saveConfig,
  loadConfig,
  listProfiles,
  switchProfile,
  switchDefaultTeam,
  addProfile,
  getActiveProfile,
} from "../core/config.js";
import {
  formatIssueDetail,
  formatIssueList,
  formatTeams,
  formatProjects,
  formatProfiles,
  formatLabels,
} from "../core/formatters.js";
import type { OutputFormat } from "../core/types.js";

export const authStatusToolSchema = {
  name: "linear_auth_status",
  description: "Check current active profile, workspace organization, and viewer info.",
  inputSchema: {
    type: "object",
    properties: {
      profileName: { type: "string", description: "Optional target profile/workspace for isolation" },
    },
  },
};

export const authListToolSchema = {
  name: "linear_auth_list",
  description: "List all saved Linear authentication profiles and workspaces.",
  inputSchema: {
    type: "object",
    properties: {
      format: { type: "string", enum: ["markdown", "compact_json"], default: "markdown" },
    },
  },
};

export const authSwitchToolSchema = {
  name: "linear_auth_switch",
  description: "Switch active authentication profile, workspace, or default team.",
  inputSchema: {
    type: "object",
    properties: {
      profileName: { type: "string", description: "Name of profile/workspace to activate (e.g. 'playzuzu', 'myrehat')" },
      teamKey: { type: "string", description: "Optional default team key to activate (e.g. 'ENG')" },
    },
  },
};

export const setApiKeyToolSchema = {
  name: "linear_set_api_key",
  description: "Add or set a long-lived Linear Personal API Key for a profile/workspace.",
  inputSchema: {
    type: "object",
    properties: {
      apiKey: { type: "string", description: "Linear Personal API Key (starts with 'lin_api_')" },
      profileName: { type: "string", description: "Optional profile/workspace name (e.g., 'playzuzu', 'myrehat'). Defaults to 'default'." },
      teamKey: { type: "string", description: "Optional default team key (e.g., 'ENG')" },
    },
    required: ["apiKey"],
  },
};

export const getIssueToolSchema = {
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
        description: "Output format: 'markdown' (compact card), 'compact_json' (minified JSON), 'raw_json' (raw API response)",
      },
    },
    required: ["id"],
  },
};

export const searchIssuesToolSchema = {
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
        default: "markdown",
      },
    },
    required: ["query"],
  },
};

export const getMyIssuesToolSchema = {
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
        default: "markdown",
      },
    },
  },
};

export const manageIssueToolSchema = {
  name: "linear_manage_issue",
  description: "Unified tool to create, update, comment, close, resolve, or bulk create Linear issues in a single action call.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "update", "comment", "close", "resolve", "bulk_create"],
        description: "Action to perform",
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
      commentBody: { type: "string", description: "Comment body text" },
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
            blocks: { type: "array", items: { type: "string" } },
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

export const bulkCreateIssuesToolSchema = {
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
            blocks: { type: "array", items: { type: "string" }, description: "Blocked issue IDs/identifiers" },
          },
          required: ["title"],
        },
        description: "List of issue objects to create",
      },
      defaultTeamKey: { type: "string", description: "Default team key if omitted in individual issue items" },
      profileName: { type: "string", description: "Target workspace profile name" },
      format: {
        type: "string",
        enum: ["markdown", "compact_json"],
        default: "markdown",
      },
    },
    required: ["issues"],
  },
};

export const getTeamsAndProjectsToolSchema = {
  name: "linear_get_teams_and_projects",
  description: "Get list of available Linear teams and projects for the active workspace.",
  inputSchema: {
    type: "object",
    properties: {
      profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
      format: {
        type: "string",
        enum: ["markdown", "compact_json"],
        default: "markdown",
      },
    },
  },
};

export const getLabelsToolSchema = {
  name: "linear_get_labels",
  description: "Get list of available issue labels for the active workspace.",
  inputSchema: {
    type: "object",
    properties: {
      profileName: { type: "string", description: "Target workspace profile name for parallel agent isolation" },
      format: {
        type: "string",
        enum: ["markdown", "compact_json", "raw_json"],
        default: "markdown",
      },
    },
  },
};

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
    "1. **Provide Key in Chat**: Paste your Personal API Key (starts with `lin_api_`) here, and I will save it using `linear_set_api_key`.",
    "2. **Switch Profile**: If you already saved a profile, run `linear_auth_switch({ profileName: 'playzuzu' })`.",
    "3. **CLI Setup**: Run `bun x github:ImBIOS/belifoa#canary auth add <profile-name> <lin_api_...>` in your terminal.",
    "",
    "_To create a Personal API Key, go to Linear Settings -> Account -> API -> Personal API keys._",
  ].join("\n");
}

export async function handleToolCall(
  name: string,
  args: any,
  client: BelifoaClient
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const format: OutputFormat = args.format || "markdown";
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
                  `✅ **Active Profile**: \`${active?.name || "default"}\``,
                  `- **Workspace / Org**: ${org.name} (\`${org.urlKey}\`)`,
                  `- **User**: ${me.name} (${me.email || me.id})`,
                  `- **Default Team**: ${active?.defaultTeam || "None"}`,
                ].join("\n"),
              },
            ],
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

      case "linear_set_api_key": {
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

      case "linear_get_issue": {
        const issue = await targetClient.getIssue(args.id);
        return { content: [{ type: "text", text: formatIssueDetail(issue, format) }] };
      }

      case "linear_search_issues": {
        const active = getActiveProfile(args.profileName);
        const teamKey = args.teamKey || active?.defaultTeam;
        const issues = await targetClient.searchIssues(args.query, {
          teamKey,
          limit: args.limit,
        });
        return { content: [{ type: "text", text: formatIssueList(issues, format) }] };
      }

      case "linear_get_my_issues": {
        const issues = await targetClient.getMyIssues(args.limit || 20);
        return { content: [{ type: "text", text: formatIssueList(issues, format) }] };
      }

      case "linear_manage_issue": {
        const active = getActiveProfile(args.profileName);
        if (args.action === "bulk_create") {
          const defaultTeam = args.teamKey || active?.defaultTeam;
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
          }));

          const result = await targetClient.createBulkIssues(items, defaultTeam);
          const parts: string[] = [];
          if (result.created.length > 0) {
            parts.push(`✅ Created ${result.created.length} issue(s):\n\n${formatIssueList(result.created, format)}`);
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
          });
          return { content: [{ type: "text", text: `✅ Created issue:\n\n${formatIssueDetail(created, format)}` }] };
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
            await targetClient.addComment(args.issueId, args.commentBody);
            const refreshed = await targetClient.getIssue(args.issueId).catch(() => updated);
            return { content: [{ type: "text", text: `✅ Updated issue:\n\n${formatIssueDetail(refreshed, format)}` }] };
          }
          return { content: [{ type: "text", text: `✅ Updated issue:\n\n${formatIssueDetail(updated, format)}` }] };
        }

        if (args.action === "close" || args.action === "resolve") {
          if (!args.issueId) throw new Error("issueId is required for 'close' or 'resolve'.");
          const updated = await targetClient.updateIssue(args.issueId, { state: "Done" });
          if (args.commentBody) {
            await targetClient.addComment(args.issueId, args.commentBody);
          }
          const refreshed = args.commentBody ? await targetClient.getIssue(args.issueId).catch(() => updated) : updated;
          return { content: [{ type: "text", text: `✅ Closed/Resolved issue ${args.issueId}:\n\n${formatIssueDetail(refreshed, format)}` }] };
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
                text: `✅ Added comment to ${args.issueId}:\n> ${comment.body}`,
              },
            ],
          };
        }

        throw new Error(`Unsupported action: ${args.action}`);
      }

      case "linear_bulk_create_issues": {
        const active = getActiveProfile(args.profileName);
        const defaultTeam = args.defaultTeamKey || active?.defaultTeam;
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
        }));

        const result = await targetClient.createBulkIssues(items, defaultTeam);
        const parts: string[] = [];
        if (result.created.length > 0) {
          parts.push(`✅ Created ${result.created.length} issue(s):\n\n${formatIssueList(result.created, format)}`);
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

      case "linear_get_teams_and_projects": {
        const teams = await targetClient.getTeams();
        const projects = await targetClient.getProjects();
        const text = [formatTeams(teams, format), "", formatProjects(projects, format)].join("\n");
        return { content: [{ type: "text", text }] };
      }

      case "linear_get_labels": {
        const labels = await targetClient.getIssueLabels();
        return { content: [{ type: "text", text: formatLabels(labels, format) }] };
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
