import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { BelifoaClient } from "../src/core/client.js";
import { cleanRawIssue } from "../src/core/formatters.js";
import { saveConfig } from "../src/core/config.js";

const TEST_CONFIG_DIR = "/tmp/belifoa-unit-tests-client";

beforeAll(() => {
  process.env.BELIFOA_CONFIG_DIR = TEST_CONFIG_DIR;
  saveConfig({
    activeProfile: "test",
    profiles: {
      test: { name: "test", apiKey: "lin_api_fresh_key" },
    },
  });
});

afterAll(() => {
  delete process.env.BELIFOA_CONFIG_DIR;
});

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

  it("issueCreate mutation omits clientId (Linear schema regression guard)", async () => {
    const client = new BelifoaClient("fake-key");
    client.getTeams = async () => [{ id: "team-1", name: "Engineering", key: "ENG" }];
    let capturedQuery = "";
    let capturedVariables: any = {};
    client["graphql"] = async (queryStr: string, variables: any) => {
      capturedQuery = queryStr;
      capturedVariables = variables;
      return {
        issueCreate: {
          success: true,
          issue: { id: "i1", identifier: "ENG-1", title: "Test", priority: 0 },
        },
      } as any;
    };

    await client.createIssue({ teamIdOrKey: "ENG", title: "Test" });

    expect(capturedQuery).toContain("mutation CreateIssue($input: IssueCreateInput!)");
    expect(capturedQuery).toContain("issueCreate(input: $input)");
    expect(capturedQuery).not.toContain("clientId");
    expect(capturedVariables).not.toHaveProperty("clientId");
    expect(capturedVariables.input).not.toHaveProperty("clientId");
  });

  it("commentCreate mutation omits clientId (Linear schema regression guard)", async () => {
    const client = new BelifoaClient("fake-key");
    let capturedQuery = "";
    let capturedVariables: any = {};
    client["graphql"] = async (queryStr: string, variables: any) => {
      capturedQuery = queryStr;
      capturedVariables = variables;
      return { commentCreate: { success: true, comment: { id: "c1", body: "hi", createdAt: "x" } } } as any;
    };

    await client.addComment("issue-1", "hi");

    expect(capturedQuery).toContain("mutation CreateComment($input: CommentCreateInput!)");
    expect(capturedQuery).toContain("commentCreate(input: $input)");
    expect(capturedQuery).not.toContain("clientId");
    expect(capturedVariables).not.toHaveProperty("clientId");
    expect(capturedVariables.input).not.toHaveProperty("clientId");
  });

  it("errors instead of silently dropping unresolved label names", async () => {
    const client = new BelifoaClient("fake-key");
    client.getIssueLabels = async () => [
      { id: "lbl-bug", name: "Bug" },
      { id: "lbl-sec", name: "Security" },
    ];

    const err: any = await client
      .resolveLabelIds("bug,security,typo-label")
      .then(() => null)
      .catch((e) => e);

    expect(err).not.toBeNull();
    expect(err.message).toContain("typo-label");
    expect(err.suggestions.availableLabels).toContain("Bug");
    expect(err.suggestions.availableLabels).toContain("Security");
  });

  it("re-reads config from disk and retries once when the API rejects with 401", async () => {
    const client = new BelifoaClient("lin_api_stale_key", "test");
    let calls = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) {
        return new Response(
          JSON.stringify({ errors: [{ message: "Authentication required, not authenticated" }] }),
          { status: 401 }
        );
      }
      return new Response(
        JSON.stringify({ data: { viewer: { id: "u1", name: "Fresh User", email: "fresh@example.com" } } }),
        { status: 200 }
      );
    }) as typeof fetch;

    try {
      const me = await client.getMe();
      expect(me.id).toBe("u1");
      expect(calls).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not retry when the refreshed key is unchanged (key still invalid)", async () => {
    const client = new BelifoaClient("lin_api_fresh_key", "test");
    let calls = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      calls++;
      return new Response(
        JSON.stringify({ errors: [{ message: "Authentication required, not authenticated" }] }),
        { status: 401 }
      );
    }) as typeof fetch;

    try {
      await expect(client.getMe()).rejects.toThrow("401");
      expect(calls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
