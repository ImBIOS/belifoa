/**
 * Realistic raw Linear GraphQL API responses representing typical responses
 * received from official Linear MCP server tools.
 */

export const RAW_LINEAR_SEARCH_RESPONSE = {
  data: {
    issueSearch: {
      nodes: [
        {
          __typename: "Issue",
          id: "e8b2b2b1-1234-4567-8901-abcdef123456",
          identifier: "ENG-101",
          title: "Fix authentication token refresh race condition under high concurrency",
          description: "When multiple requests are executed simultaneously after token expiration, the token refresh logic triggers multiple parallel OAuth refresh token exchanges, invalidating active sessions and forcing the user to re-login.",
          priority: 1,
          url: "https://linear.app/myorg/issue/ENG-101/fix-authentication-token-refresh-race-condition",
          createdAt: "2026-07-28T10:15:30.000Z",
          updatedAt: "2026-07-30T08:22:11.000Z",
          archivedAt: null,
          canceledAt: null,
          completedAt: null,
          dueDate: null,
          estimate: 3,
          state: {
            __typename: "WorkflowState",
            id: "state-in-progress-id",
            name: "In Progress",
            color: "#f2994a",
            type: "started",
          },
          team: {
            __typename: "Team",
            id: "team-eng-id",
            key: "ENG",
            name: "Engineering Core",
          },
          assignee: {
            __typename: "User",
            id: "user-imbios-id",
            name: "ImBIOS",
            email: "imbios@example.com",
            avatarUrl: "https://lh3.googleusercontent.com/a/default-avatar",
          },
          project: {
            __typename: "Project",
            id: "project-auth-id",
            name: "Auth & Security Hardening",
            state: "started",
          },
          labels: {
            __typename: "IssueLabelConnection",
            nodes: [
              { __typename: "IssueLabel", id: "label-1", name: "bug", color: "#eb5757" },
              { __typename: "IssueLabel", id: "label-2", name: "security", color: "#27ae60" },
              { __typename: "IssueLabel", id: "label-3", name: "high-priority", color: "#bb6bd9" },
            ],
          },
        },
        {
          __typename: "Issue",
          id: "f9c3c3c2-2345-5678-9012-bcdefa234567",
          identifier: "ENG-102",
          title: "Optimize Linear MCP output payloads for AI Agent context efficiency",
          description: "Currently the raw JSON output from the Linear GraphQL endpoint contains heavy GraphQL metadata like __typename, deep node wrappers, unused avatar URLs, and color codes. We need compact Markdown/JSON formatters.",
          priority: 2,
          url: "https://linear.app/myorg/issue/ENG-102/optimize-linear-mcp-output-payloads",
          createdAt: "2026-07-29T14:00:00.000Z",
          updatedAt: "2026-07-30T09:10:00.000Z",
          archivedAt: null,
          canceledAt: null,
          completedAt: null,
          dueDate: null,
          estimate: 2,
          state: {
            __typename: "WorkflowState",
            id: "state-todo-id",
            name: "Todo",
            color: "#e0e0e0",
            type: "unstarted",
          },
          team: {
            __typename: "Team",
            id: "team-eng-id",
            key: "ENG",
            name: "Engineering Core",
          },
          assignee: {
            __typename: "User",
            id: "user-imbios-id",
            name: "ImBIOS",
            email: "imbios@example.com",
            avatarUrl: "https://lh3.googleusercontent.com/a/default-avatar",
          },
          project: {
            __typename: "Project",
            id: "project-belifoa-id",
            name: "Belifoa Development",
            state: "started",
          },
          labels: {
            __typename: "IssueLabelConnection",
            nodes: [
              { __typename: "IssueLabel", id: "label-4", name: "feature", color: "#2f80ed" },
              { __typename: "IssueLabel", id: "label-5", name: "ai-agent", color: "#9b51e0" },
            ],
          },
        },
        {
          __typename: "Issue",
          id: "a1a1a1a1-3456-6789-0123-cdefab345678",
          identifier: "ENG-103",
          title: "Add support for long-lived Personal API Key authentication",
          description: "Short OAuth expiry causes frequent interruption in agent workflow loops. Support LINEAR_API_KEY environment variable.",
          priority: 1,
          url: "https://linear.app/myorg/issue/ENG-103/add-support-for-long-lived-personal-api-key",
          createdAt: "2026-07-29T16:30:00.000Z",
          updatedAt: "2026-07-30T11:05:00.000Z",
          archivedAt: null,
          canceledAt: null,
          completedAt: "2026-07-30T11:05:00.000Z",
          dueDate: null,
          estimate: 1,
          state: {
            __typename: "WorkflowState",
            id: "state-done-id",
            name: "Done",
            color: "#27ae60",
            type: "completed",
          },
          team: {
            __typename: "Team",
            id: "team-eng-id",
            key: "ENG",
            name: "Engineering Core",
          },
          assignee: {
            __typename: "User",
            id: "user-imbios-id",
            name: "ImBIOS",
            email: "imbios@example.com",
            avatarUrl: "https://lh3.googleusercontent.com/a/default-avatar",
          },
          project: {
            __typename: "Project",
            id: "project-belifoa-id",
            name: "Belifoa Development",
            state: "started",
          },
          labels: {
            __typename: "IssueLabelConnection",
            nodes: [
              { __typename: "IssueLabel", id: "label-6", name: "auth", color: "#f2c94c" },
            ],
          },
        },
      ],
    },
  },
};

export const RAW_LINEAR_ISSUE_DETAIL_RESPONSE = {
  data: {
    issue: {
      __typename: "Issue",
      id: "f9c3c3c2-2345-5678-9012-bcdefa234567",
      identifier: "ENG-102",
      title: "Optimize Linear MCP output payloads for AI Agent context efficiency",
      description: `### Context
Official Linear MCP returns the raw GraphQL JSON response containing extensive metadata, schema typing (__typename), node arrays, and nested structures.

### Problem
1. High token cost per agent call (over 1,500 tokens for a basic issue query).
2. Cluttered context windows making it harder for LLMs to extract actionable info.
3. Excessive turns required when using separate fine-grained tools for search, detail, comment, and update.

### Proposed Solution
Create Belifoa with:
- Markdown card / table formatters
- Minimal JSON formatters
- Consolidated 'manage_issue' tool
- Benchmarking suite to measure token savings objectively.`,
      priority: 2,
      url: "https://linear.app/myorg/issue/ENG-102/optimize-linear-mcp-output-payloads",
      createdAt: "2026-07-29T14:00:00.000Z",
      updatedAt: "2026-07-30T09:10:00.000Z",
      archivedAt: null,
      canceledAt: null,
      completedAt: null,
      dueDate: null,
      estimate: 2,
      state: {
        __typename: "WorkflowState",
        id: "state-todo-id",
        name: "Todo",
        color: "#e0e0e0",
        type: "unstarted",
      },
      team: {
        __typename: "Team",
        id: "team-eng-id",
        key: "ENG",
        name: "Engineering Core",
      },
      assignee: {
        __typename: "User",
        id: "user-imbios-id",
        name: "ImBIOS",
        email: "imbios@example.com",
        avatarUrl: "https://lh3.googleusercontent.com/a/default-avatar",
      },
      project: {
        __typename: "Project",
        id: "project-belifoa-id",
        name: "Belifoa Development",
        state: "started",
      },
      labels: {
        __typename: "IssueLabelConnection",
        nodes: [
          { __typename: "IssueLabel", id: "label-4", name: "feature", color: "#2f80ed" },
          { __typename: "IssueLabel", id: "label-5", name: "ai-agent", color: "#9b51e0" },
        ],
      },
      comments: {
        __typename: "CommentConnection",
        nodes: [
          {
            __typename: "Comment",
            id: "comment-1",
            body: "Benchmarking initial test case shows ~75% token reduction when converting raw JSON to Markdown tables.",
            createdAt: "2026-07-30T08:00:00.000Z",
            user: {
              __typename: "User",
              id: "user-imbios-id",
              name: "ImBIOS",
              email: "imbios@example.com",
            },
          },
          {
            __typename: "Comment",
            id: "comment-2",
            body: "Great! Let's ensure Bun and pnpm support are included in the build scripts as well.",
            createdAt: "2026-07-30T08:30:00.000Z",
            user: {
              __typename: "User",
              id: "user-lead-id",
              name: "Lead Dev",
              email: "lead@example.com",
            },
          },
        ],
      },
    },
  },
};
