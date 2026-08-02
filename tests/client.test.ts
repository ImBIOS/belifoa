import { describe, expect, it } from "bun:test";
import { BelifoaClient } from "../src/core/client.js";
import { cleanRawIssue } from "../src/core/formatters.js";

describe("BelifoaClient & Formatter Extensions", () => {
  it("cleans raw issue with estimate, dueDate, and labels", () => {
    const raw = {
      id: "issue-123",
      identifier: "ENG-456",
      title: "Test Issue",
      description: "Test description",
      priority: 2,
      estimate: 5,
      dueDate: "2026-08-15",
      state: { name: "In Progress" },
      team: { key: "ENG" },
      assignee: { name: "Jane Doe", email: "jane@example.com" },
      project: { name: "Launch Q3" },
      labels: { nodes: [{ name: "frontend" }, { name: "bug" }] },
    };

    const cleaned = cleanRawIssue(raw);
    expect(cleaned.identifier).toBe("ENG-456");
    expect(cleaned.estimate).toBe(5);
    expect(cleaned.dueDate).toBe("2026-08-15");
    expect(cleaned.labels).toEqual(["frontend", "bug"]);
    expect(cleaned.assignee).toBe("Jane Doe");
    expect(cleaned.project).toBe("Launch Q3");
  });

  it("handles label IDs array in resolveLabelIds", async () => {
    const client = new BelifoaClient("fake-key");
    const labelUuid1 = "12345678-1234-1234-1234-123456789012";
    const labelUuid2 = "87654321-4321-4321-4321-210987654321";

    const resolved = await client.resolveLabelIds([labelUuid1, labelUuid2]);
    expect(resolved).toEqual([labelUuid1, labelUuid2]);
  });

  it("resolves 'me' and '@me' via getMe in resolveUserId", async () => {
    const client = new BelifoaClient("fake-key");
    client.getMe = async () => ({ id: "user-me-123", name: "Current User", email: "me@example.com" });

    const id1 = await client.resolveUserId("me");
    expect(id1).toBe("user-me-123");

    const id2 = await client.resolveUserId("@me");
    expect(id2).toBe("user-me-123");
  });
});
