import { describe, expect, it, beforeAll } from "bun:test";

beforeAll(() => {
  process.env.BELIFOA_CONFIG_DIR = "/tmp/belifoa-unit-tests-features";
});

import { BelifoaClient } from "../src/core/client.js";
import { formatLabels, generateGitBranchName, cleanRawIssue, formatIssueDetail } from "../src/core/formatters.js";
import { addProfile, getActiveProfile, switchProfile, detectTeamFromCwd } from "../src/core/config.js";
import { BelifoaSuggestionError } from "../src/core/types.js";
import { handleToolCall } from "../src/mcp/tools.js";

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
});
