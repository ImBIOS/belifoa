import { z } from "zod";
import { BelifoaClient } from "../core/client.js";
import {
  formatIssueDetail,
  formatIssueList,
  formatTeams,
  formatProjects,
} from "../core/formatters.js";
import type { OutputFormat } from "../core/types.js";

export const getIssueToolSchema = {
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
  description: "Unified tool to create, update, or add comments to a Linear issue in a single action call.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "update", "comment"],
        description: "Action to perform",
      },
      issueId: { type: "string", description: "Issue identifier for 'update' or 'comment' (e.g. ENG-123)" },
      teamKey: { type: "string", description: "Team key for 'create' (e.g. ENG)" },
      title: { type: "string", description: "Issue title for 'create' or 'update'" },
      description: { type: "string", description: "Description text" },
      priority: { type: "number", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" },
      commentBody: { type: "string", description: "Comment body text" },
      format: {
        type: "string",
        enum: ["markdown", "compact_json"],
        default: "markdown",
      },
    },
    required: ["action"],
  },
};

export const getTeamsAndProjectsToolSchema = {
  name: "linear_get_teams_and_projects",
  description: "Get list of available Linear teams and projects.",
  inputSchema: {
    type: "object",
    properties: {
      format: {
        type: "string",
        enum: ["markdown", "compact_json"],
        default: "markdown",
      },
    },
  },
};

export async function handleToolCall(
  name: string,
  args: any,
  client: BelifoaClient
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const format: OutputFormat = args.format || "markdown";

  switch (name) {
    case "linear_get_issue": {
      const issue = await client.getIssue(args.id);
      return { content: [{ type: "text", text: formatIssueDetail(issue, format) }] };
    }

    case "linear_search_issues": {
      const issues = await client.searchIssues(args.query, {
        teamKey: args.teamKey,
        limit: args.limit,
      });
      return { content: [{ type: "text", text: formatIssueList(issues, format) }] };
    }

    case "linear_get_my_issues": {
      const issues = await client.getMyIssues(args.limit || 20);
      return { content: [{ type: "text", text: formatIssueList(issues, format) }] };
    }

    case "linear_manage_issue": {
      if (args.action === "create") {
        if (!args.teamKey || !args.title) {
          throw new Error("teamKey and title are required when action is 'create'.");
        }
        const created = await client.createIssue({
          teamIdOrKey: args.teamKey,
          title: args.title,
          description: args.description,
          priority: args.priority,
        });
        return { content: [{ type: "text", text: `✅ Created issue:\n\n${formatIssueDetail(created, format)}` }] };
      }

      if (args.action === "update") {
        if (!args.issueId) throw new Error("issueId is required for 'update'.");
        const updated = await client.updateIssue(args.issueId, {
          title: args.title,
          description: args.description,
          priority: args.priority,
        });
        return { content: [{ type: "text", text: `✅ Updated issue:\n\n${formatIssueDetail(updated, format)}` }] };
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
              text: `✅ Added comment to ${args.issueId}:\n> ${comment.body}`,
            },
          ],
        };
      }

      throw new Error(`Unsupported action: ${args.action}`);
    }

    case "linear_get_teams_and_projects": {
      const teams = await client.getTeams();
      const projects = await client.getProjects();
      const text = [formatTeams(teams, format), "", formatProjects(projects, format)].join("\n");
      return { content: [{ type: "text", text }] };
    }

    default:
      throw new Error(`Unknown tool name: ${name}`);
  }
}
