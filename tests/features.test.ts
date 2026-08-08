import { describe, expect, it, beforeAll } from "bun:test";

beforeAll(() => {
  process.env.BELIFOA_CONFIG_DIR = "/tmp/belifoa-unit-tests-features";
});

import { BelifoaClient } from "../src/core/client.js";
import { formatLabels, generateGitBranchName, cleanRawIssue, formatIssueDetail, formatActiveProfileBanner, formatIssueList } from "../src/core/formatters.js";
import { addProfile, getActiveProfile, switchProfile, switchDefaultTeam, detectTeamFromCwd, getProjectConfig } from "../src/core/config.js";
import { BelifoaSuggestionError } from "../src/core/types.js";
import { handleToolCall, getMcpToolSchemas } from "../src/mcp/tools.js";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

describe("Belifoa New Features Unit Tests", () => {
  it("formatLabels formats label list into cli_table, markdown, and compact_json", () => {
    const labels = [
      { id: "lbl-1", name: "Bug" },
      { id: "lbl-2", name: "Feature" },
    ];

    const md = formatLabels(labels, "markdown");
    expect(md).toContain("### Issue Labels:");
    expect(md).toContain("| **Bug** | `lbl-1` |");

    const json = formatLabels(labels, "compact_json");
    const parsed = JSON.parse(json);
    expect(parsed).toEqual([
      { name: "Bug", id: "lbl-1" },
      { name: "Feature", id: "lbl-2" },
    ]);

    const table = formatLabels(labels, "cli_table");
    expect(table).toContain("LABEL NAME");
    expect(table).toContain("Bug");
  });

  it("generateGitBranchName produces standard Linear branch slugs", () => {
    const slug1 = generateGitBranchName({
      identifier: "IMA-49",
      title: "Investigate listing issue",
      assignee: "imamuzzaki",
    });
    expect(slug1).toBe("imamuzzaki/ima-49-investigate-listing-issue");

    const slug2 = generateGitBranchName({
      identifier: "ENG-123",
      title: "Fix Auth Race Condition!",
    });
    expect(slug2).toBe("eng-123-fix-auth-race-condition");
  });

  it("detectTeamFromCwd auto-detects team key from folder or repo name", () => {
    const profile = {
      name: "test",
      apiKey: "fake",
      teams: [
        { key: "ORDERLY", name: "Orderly App" },
        { key: "IMA", name: "Imam Workspace" },
      ],
    };

    const detected = detectTeamFromCwd(profile, "/path/to/projects/orderly-web");
    expect(detected).toBe("ORDERLY");
  });

  it("cleanRawIssue & formatIssueDetail support hierarchy, relations, and git branch name", () => {
    const rawNode = {
      id: "uuid-123",
      identifier: "ENG-101",
      title: "Implement JWT refresh token",
      priority: 1,
      state: { name: "In Progress" },
      team: { key: "ENG" },
      assignee: { name: "Alice Smith" },
      parent: { id: "p-1", identifier: "ENG-100", title: "Authentication Flow" },
      children: { nodes: [{ id: "c-1", identifier: "ENG-102", title: "Cookie storage", state: { name: "Todo" } }] },
      relations: { nodes: [{ id: "r-1", type: "blocks", relatedIssue: { id: "rel-1", identifier: "ENG-105", title: "Frontend Login UI" } }] },
    };

    const issue = cleanRawIssue(rawNode);
    expect(issue.gitBranchName).toBe("alice/eng-101-implement-jwt-refresh-token");
    expect(issue.parent?.identifier).toBe("ENG-100");
    expect(issue.children?.[0].identifier).toBe("ENG-102");
    expect(issue.relations?.[0].relatedIssue.identifier).toBe("ENG-105");

    const jsonStr = formatIssueDetail(issue, "compact_json");
    const json = JSON.parse(jsonStr);
    expect(json.gitBranchName).toBe("alice/eng-101-implement-jwt-refresh-token");
    expect(json.parent).toBe("ENG-100");
    expect(json.children).toEqual(["ENG-102"]);

    const md = formatIssueDetail(issue, "markdown");
    expect(md).toContain("Git Branch**: `alice/eng-101-implement-jwt-refresh-token`");
    expect(md).toContain("Parent**: [ENG-100]");
  });

  it("BelifoaSuggestionError returns structured available options on invalid inputs", async () => {
    const client = new BelifoaClient("fake-key");
    client.getTeams = async () => [
      { id: "t1", key: "ENG", name: "Engineering" },
      { id: "t2", key: "ORDERLY", name: "Orderly" },
    ];

    try {
      await client.createIssue({ teamIdOrKey: "MYR", title: "Test issue" });
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      expect(err).toBeInstanceOf(BelifoaSuggestionError);
      expect(err.suggestions.error).toContain("Team 'MYR' not found");
      expect(err.suggestions.availableTeams).toHaveLength(2);
    }
  });

  it("handleToolCall formats structured suggestion error objects for LLMs", async () => {
    const client = new BelifoaClient("fake-key");
    client.getTeams = async () => [
      { id: "t1", key: "ENG", name: "Engineering" },
    ];

    const result = await handleToolCall(
      "linear_manage_issue",
      { action: "create", teamKey: "INVALID", title: "Sample" },
      client
    );

    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.availableTeams).toEqual([{ key: "ENG", name: "Engineering", id: "t1" }]);
  });

  it("resolveStateId falls back to 'completed' type state when state string is 'done' or 'resolved'", async () => {
    const client = new BelifoaClient("fake-key");
    client.getTeamStates = async (_teamId: string) => [
      { id: "state-1", name: "Backlog", type: "unstarted" },
      { id: "state-2", name: "In Development", type: "started" },
      { id: "state-3", name: "Shipped", type: "completed" },
    ];

    // Direct name match
    const id1 = await client.resolveStateId("team-1", "In Development");
    expect(id1).toBe("state-2");

    // "Done" requested when state name is "Shipped" -> falls back to type "completed"
    const id2 = await client.resolveStateId("team-1", "Done");
    expect(id2).toBe("state-3");

    // "resolved" requested -> falls back to type "completed"
    const id3 = await client.resolveStateId("team-1", "resolved");
    expect(id3).toBe("state-3");
  });

  it("getActiveProfile respects defaultAssignee in active profile or environment", () => {
    addProfile(
      "assignee-test",
      "lin_api_key_test",
      { id: "org-test", name: "Test Org", urlKey: "test" },
      "ENG"
    );
    switchProfile("assignee-test");

    process.env.BELIFOA_DEFAULT_ASSIGNEE = "me";
    const active = getActiveProfile();
    expect(active?.defaultAssignee).toBe("me");

    delete process.env.BELIFOA_DEFAULT_ASSIGNEE;
  });

  it("1. Tool Namespacing in Monorepos: getMcpToolSchemas prefixes tools with workspace profile and handleToolCall resolves prefixed tool calls", async () => {
    addProfile(
      "myrehat",
      "lin_api_myrehat_123",
      { id: "org-myr", name: "MyRehat Ltd", urlKey: "myrehat" },
      "MYR"
    );
    switchProfile("myrehat");

    const schemas = getMcpToolSchemas("myrehat");
    expect(schemas.some((s) => s.name === "belifoa_myrehat_create_issue")).toBe(true);
    expect(schemas.some((s) => s.name === "belifoa_myrehat_list_issues")).toBe(true);
    expect(schemas.some((s) => s.name === "belifoa_myrehat_get_issue")).toBe(true);

    const client = new BelifoaClient("fake-key", "myrehat");
    client.getMyIssues = async () => [
      {
        id: "id-1",
        identifier: "MYR-10",
        title: "Monorepo tool namespacing bug",
        status: "In Progress",
        priority: 1,
        priorityLabel: "Urgent 🔴",
      },
    ];

    const result = await handleToolCall("belifoa_myrehat_list_issues", {}, client);
    expect(result.content[0].text).toContain("MYR-10");
    expect(result.content[0].text).toContain("[belifoa] Active Profile");
  });

  it("2. Automatic Directory Ancestor Resolution: parses .mcp.json and scans submodules", () => {
    const testDir = "/tmp/test-mcp-ancestor/submodule-app";
    mkdirSync(testDir, { recursive: true });
    const mcpPath = join("/tmp/test-mcp-ancestor", ".mcp.json");
    writeFileSync(
      mcpPath,
      JSON.stringify({
        mcpServers: {
          belifoa: {
            command: "bun",
            args: ["x", "belifoa", "mcp"],
            env: { BELIFOA_PROFILE: "myrehat", BELIFOA_DEFAULT_TEAM: "MYR" },
          },
        },
      })
    );

    // Parent directory traversal resolves .mcp.json from submodule-app
    const conf = getProjectConfig(testDir);
    expect(conf?.profile).toBe("myrehat");
    expect(conf?.team).toBe("MYR");

    // Child directory scanning resolves config in submodules
    const rootConf = getProjectConfig("/tmp/test-mcp-ancestor");
    expect(rootConf?.profile).toBe("myrehat");

    rmSync("/tmp/test-mcp-ancestor", { recursive: true, force: true });
  });

  it("4. Explicit Active Profile Banner: prints 1-line context header in markdown and cli_table", () => {
    const profile = {
      name: "myrehat",
      apiKey: "lin_api_test",
      organization: { id: "org-1", name: "MyRehat Workspace", urlKey: "myrehat" },
      defaultTeam: "MYR",
    };

    const bannerMd = formatActiveProfileBanner(profile, "markdown");
    expect(bannerMd).toContain("> **[belifoa] Active Profile**: `myrehat` (Workspace: **MyRehat Workspace**, Default Team: **MYR**)");

    const bannerAnsi = formatActiveProfileBanner(profile, "cli_table");
    expect(bannerAnsi).toContain("[belifoa]");
    expect(bannerAnsi).toContain("Active Profile:");
    expect(bannerAnsi).toContain("myrehat");
    expect(bannerAnsi).toContain("MyRehat Workspace");

    const issues = [
      {
        id: "id-1",
        identifier: "MYR-1",
        title: "Test Banner Issue",
        status: "Todo",
        priority: 2,
        priorityLabel: "High 🟠",
      },
    ];

    const outputMd = formatIssueList(issues, "markdown", profile);
    expect(outputMd).toContain("[belifoa] Active Profile");
    expect(outputMd).toContain("MYR-1");
  });

  it("5. searchIssues uses issues query for empty query and searchIssues query for non-empty query", async () => {
    const client = new BelifoaClient("fake-key");
    let lastQuery = "";
    let lastVariables: any = {};

    client["graphql"] = async (queryStr: string, variables: any) => {
      lastQuery = queryStr;
      lastVariables = variables;
      if (queryStr.includes("query ListIssues")) {
        return { issues: { nodes: [{ id: "1", identifier: "ENG-1", title: "Test", priority: 0 }] } } as any;
      }
      return { searchIssues: { nodes: [{ id: "2", identifier: "ENG-2", title: "Search Test", priority: 0 }] } } as any;
    };

    const emptyResult = await client.searchIssues("");
    expect(lastQuery).toContain("query ListIssues");
    expect(emptyResult[0].identifier).toBe("ENG-1");

    const searchResult = await client.searchIssues("search text");
    expect(lastQuery).toContain("query SearchIssues");
    expect(lastVariables.term).toBe("search text");
    expect(searchResult[0].identifier).toBe("ENG-2");
  });

  it("6. switchDefaultTeam resolves active profile when profileName is omitted and validates accessible teams", () => {
    addProfile(
      "playzuzu",
      "key1",
      { id: "o1", name: "ZuZu", urlKey: "zuzu" },
      "ZUZ",
      [{ key: "ZUZ", name: "ZuZu Team" }]
    );
    addProfile(
      "myrehat",
      "key2",
      { id: "o2", name: "MyRehat", urlKey: "myrehat" },
      "MYR",
      [{ key: "MYR", name: "MyRehat Team" }]
    );

    switchProfile("playzuzu");

    // Switching default team without profileName should modify active profile ('playzuzu'), not profiles[0] ('assignee-test' or 'myrehat')
    const updated = switchDefaultTeam("ZUZ");
    expect(updated.name).toBe("playzuzu");
    expect(updated.defaultTeam).toBe("ZUZ");

    // Attempting to switch to inaccessible team in profile throws error
    expect(() => switchDefaultTeam("INVALID_TEAM")).toThrow("is not accessible in profile 'playzuzu'");
  });

  it("7. addProfile validates defaultTeam against accessible teams", () => {
    const profile = addProfile(
      "leak-test",
      "key-leak",
      { id: "o3", name: "Org3", urlKey: "o3" },
      "INVALID_TEAM",
      [{ key: "ACCESSIBLE", name: "Accessible Team" }]
    );

    expect(profile.defaultTeam).toBe("ACCESSIBLE");
  });

  it("8. createIssue with checkExisting returns existing issue if title matches", async () => {
    const client = new BelifoaClient("fake-key");
    const existingIssue = {
      id: "ex-1",
      identifier: "ZUZ-75",
      title: "Pre-generate demo assets",
      priority: 2,
      status: "In Progress",
      teamKey: "ZUZ",
    };

    client.getTeams = async () => [{ id: "t-zuz", key: "ZUZ", name: "ZuZu" }];
    client.searchIssues = async (queryStr: string) => {
      if (queryStr === "Pre-generate demo assets") {
        return [existingIssue as any];
      }
      return [];
    };

    let mutationCalled = false;
    client["graphql"] = async () => {
      mutationCalled = true;
      return {} as any;
    };

    const result = await client.createIssue({
      teamIdOrKey: "ZUZ",
      title: "Pre-generate demo assets",
      checkExisting: true,
    });

    expect(result.identifier).toBe("ZUZ-75");
    expect(mutationCalled).toBe(false);
  });
});
