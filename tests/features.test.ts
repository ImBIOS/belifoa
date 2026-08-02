import { describe, expect, it, beforeAll } from "bun:test";

beforeAll(() => {
  process.env.BELIFOA_CONFIG_DIR = "/tmp/belifoa-unit-tests-features";
});

import { BelifoaClient } from "../src/core/client.js";
import { formatLabels } from "../src/core/formatters.js";
import { addProfile, getActiveProfile, switchProfile } from "../src/core/config.js";

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
