import { describe, expect, it, beforeAll } from "bun:test";

beforeAll(() => {
  process.env.BELIFOA_CONFIG_DIR = "/tmp/belifoa-unit-tests-relevance";
});

import { BelifoaClient } from "../src/core/client.js";
import {
  tokenizeSearchQuery,
  scoreIssueRelevance,
  buildMatchContext,
} from "../src/core/relevance.js";
import { formatSearchResult, formatIssueList } from "../src/core/formatters.js";
import type { LinearIssue } from "../src/core/types.js";

function makeIssue(overrides: Partial<LinearIssue> = {}): LinearIssue {
  return {
    id: "id-1",
    identifier: "MYR-1",
    title: "Some title",
    description: "Some description",
    priority: 0,
    priorityLabel: "None",
    status: "Todo",
    teamKey: "MYR",
    labels: [],
    ...overrides,
  };
}

describe("Search relevance ranking", () => {
  it("tokenizeSearchQuery lowercases, strips punctuation, drops 1-char tokens", () => {
    expect(tokenizeSearchQuery('Spam "listing" bot - a!')).toEqual(["spam", "listing", "bot"]);
    expect(tokenizeSearchQuery("a b c spam")).toEqual(["spam"]);
    expect(tokenizeSearchQuery("")).toEqual([]);
  });

  it("weights title matches higher than description and comments", () => {
    const issue = makeIssue({
      title: "spam listing bot",
      description: "noise",
      comments: [{ id: "c1", body: "noise", createdAt: "" }],
    });
    const titleCtx = scoreIssueRelevance(issue, ["spam", "listing", "bot"], "spam listing bot");
    const descCtx = scoreIssueRelevance(
      makeIssue({ title: "noise", description: "spam listing bot" }),
      ["spam", "listing", "bot"],
      "spam listing bot"
    );
    const commentCtx = scoreIssueRelevance(
      makeIssue({ title: "noise", comments: [{ id: "c1", body: "spam listing bot", createdAt: "" }] }),
      ["spam", "listing", "bot"],
      "spam listing bot"
    );
    expect(titleCtx.score).toBeGreaterThan(descCtx.score);
    expect(descCtx.score).toBeGreaterThan(commentCtx.score);
  });

  it("identifier match scores strongly", () => {
    const ctx = scoreIssueRelevance(makeIssue({ identifier: "MYR-94" }), ["myr", "94"]);
    expect(ctx.identifier).toBe(true);
    expect(ctx.score).toBeGreaterThanOrEqual(8 * 2);
  });

  it("unrelated issues score zero", () => {
    const ctx = scoreIssueRelevance(makeIssue({ title: "unrelated work" }), ["spam", "captcha"]);
    expect(ctx.score).toBe(0);
    expect(buildMatchContext(ctx)).toBeUndefined();
  });

  it("buildMatchContext lists matched fields with tokens", () => {
    const ctx = scoreIssueRelevance(
      makeIssue({
        title: "spam listing",
        description: "captcha honeypot",
        labels: ["spam"],
        comments: [{ id: "c1", body: "honeypot trap", createdAt: "" }],
      }),
      ["spam", "listing", "captcha", "honeypot"]
    );
    const ctxStr = buildMatchContext(ctx);
    expect(ctxStr).toContain("t:spam,listing");
    expect(ctxStr).toContain("d:captcha,honeypot");
    expect(ctxStr).toContain("l:spam");
    expect(ctxStr).toContain("c:honeypot");
  });

  it("comments are indexed for scoring and stripped from search output", async () => {
    const client = new BelifoaClient("fake-key");
    client["graphql"] = async (queryStr: string, variables: any) => {
      expect(queryStr).toContain("comments(first: 5)");
      return {
        searchIssues: {
          nodes: [
            {
              id: "a",
              identifier: "MYR-1",
              title: "No token match here",
              priority: 0,
              state: { name: "Todo" },
              team: { key: "MYR" },
              labels: { nodes: [] },
              comments: { nodes: [{ id: "c1", body: "we added a honeypot to the listing form", createdAt: "" }] },
            },
          ],
          pageInfo: { hasNextPage: true, endCursor: "cur-1" },
        },
      };
    };

    const page = await client.searchIssuesPage("honeypot listing", { limit: 5 });
    expect(page.issues.length).toBe(1);
    expect(page.issues[0].matchContext).toContain("c:honeypot,listing");
    expect(page.issues[0].matchScore).toBeGreaterThan(0);
    expect(page.issues[0].comments).toBeUndefined();
    expect(page.hasNextPage).toBe(true);
    expect(page.endCursor).toBe("cur-1");
  });

  it("re-ranks results by score and drops zero-score matches when real ones exist", async () => {
    const client = new BelifoaClient("fake-key");
    client["graphql"] = async () => ({
      searchIssues: {
        nodes: [
          { id: "a", identifier: "MYR-94", title: "Infra: rotate secrets", priority: 0, state: { name: "Todo" }, team: { key: "MYR" }, labels: { nodes: [] } },
          { id: "b", identifier: "MYR-55", title: "Fix dashboard colors", priority: 0, state: { name: "Todo" }, team: { key: "MYR" }, labels: { nodes: [] } },
          { id: "c", identifier: "MYR-99", title: "Spam listing bot sends junk", priority: 2, state: { name: "Todo" }, team: { key: "MYR" }, labels: { nodes: [] } },
          { id: "d", identifier: "MYR-101", title: "Spam listing", description: "honeypot captcha", priority: 2, state: { name: "Todo" }, team: { key: "MYR" }, labels: { nodes: [] } },
        ],
        pageInfo: { hasNextPage: false, endCursor: "cur-x" },
      },
    });

    const page = await client.searchIssuesPage("spam listing bot", { limit: 15 });
    const ids = page.issues.map((i) => i.identifier);
    expect(ids).toEqual(["MYR-99", "MYR-101"]);
    expect(ids).not.toContain("MYR-94");
    expect(ids).not.toContain("MYR-55");
    expect(page.issues[0].matchScore).toBeGreaterThan(page.issues[1].matchScore);
  });

  it("keeps all results in original order when nothing scores", async () => {
    const client = new BelifoaClient("fake-key");
    client["graphql"] = async () => ({
      searchIssues: {
        nodes: [
          { id: "a", identifier: "MYR-1", title: "Alpha", priority: 0, state: { name: "Todo" }, team: { key: "MYR" }, labels: { nodes: [] } },
          { id: "b", identifier: "MYR-2", title: "Beta", priority: 0, state: { name: "Todo" }, team: { key: "MYR" }, labels: { nodes: [] } },
        ],
        pageInfo: { hasNextPage: false, endCursor: "cur-y" },
      },
    });

    const page = await client.searchIssuesPage("zzz nothing matches", { limit: 15 });
    expect(page.issues.map((i) => i.identifier)).toEqual(["MYR-1", "MYR-2"]);
    expect(page.issues.every((i) => i.matchScore === 0)).toBe(true);
  });

  it("passes after cursor and oversamples candidates", async () => {
    const client = new BelifoaClient("fake-key");
    let lastVariables: any = {};
    client["graphql"] = async (queryStr: string, variables: any) => {
      lastVariables = variables;
      return { searchIssues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: "cur-z" } } };
    };

    await client.searchIssuesPage("spam", { limit: 5, after: "cur-7" });
    expect(lastVariables.after).toBe("cur-7");
    expect(lastVariables.first).toBe(10);
  });
});

describe("Search pagination", () => {
  it("getMyIssuesPage passes after and returns pageInfo", async () => {
    const client = new BelifoaClient("fake-key");
    let lastVariables: any = {};
    client["graphql"] = async (queryStr: string, variables: any) => {
      lastVariables = variables;
      return {
        viewer: {
          assignedIssues: {
            nodes: [
              { id: "a", identifier: "MYR-1", title: "Mine", priority: 0, state: { name: "Todo" }, team: { key: "MYR" }, labels: { nodes: [] } },
            ],
            pageInfo: { hasNextPage: true, endCursor: "cur-8" },
          },
        },
      };
    };

    const page = await client.getMyIssuesPage(20, { after: "cur-9" });
    expect(lastVariables.after).toBe("cur-9");
    expect(lastVariables.first).toBe(20);
    expect(page.issues[0].identifier).toBe("MYR-1");
    expect(page.hasNextPage).toBe(true);
    expect(page.endCursor).toBe("cur-8");
  });

  it("list path (empty query) passes after and returns pageInfo", async () => {
    const client = new BelifoaClient("fake-key");
    let lastVariables: any = {};
    client["graphql"] = async (queryStr: string, variables: any) => {
      lastVariables = variables;
      return {
        issues: {
          nodes: [{ id: "a", identifier: "MYR-1", title: "Listed", priority: 0, state: { name: "Todo" }, team: { key: "MYR" }, labels: { nodes: [] } }],
          pageInfo: { hasNextPage: true, endCursor: "cur-10" },
        },
      };
    };

    const page = await client.searchIssuesPage("", { after: "cur-11", limit: 5 });
    expect(lastVariables.after).toBe("cur-11");
    expect(page.hasNextPage).toBe(true);
    expect(page.endCursor).toBe("cur-10");
  });
});

describe("Search result formatting", () => {
  it("markdown shows Match column and pagination footer", () => {
    const issues = [
      makeIssue({ identifier: "MYR-1", title: "Spam listing bot", matchScore: 9, matchContext: "t:spam,listing,bot" }),
    ];
    const out = formatSearchResult(issues, "markdown", { hasNextPage: true, endCursor: "cur-1" });
    expect(out).toContain("| ID | Title | Status | Priority | Assignee | Labels | Match |");
    expect(out).toContain("`t:spam,listing,bot`");
    expect(out).toContain("next cursor: `cur-1`");
  });

  it("compact_json wraps with page meta only when more pages exist", () => {
    const issues = [makeIssue({ identifier: "MYR-1", matchContext: "t:spam" })];
    const wrapped = JSON.parse(formatSearchResult(issues, "compact_json", { hasNextPage: true, endCursor: "cur-2" }));
    expect(wrapped.count).toBe(1);
    expect(wrapped.hasNextPage).toBe(true);
    expect(wrapped.endCursor).toBe("cur-2");
    expect(wrapped.issues[0].id).toBe("MYR-1");
    expect(wrapped.issues[0].match).toBe("t:spam");

    const plain = JSON.parse(formatSearchResult(issues, "compact_json", { hasNextPage: false }));
    expect(Array.isArray(plain)).toBe(true);
  });

  it("no pagination footer when hasNextPage is false", () => {
    const out = formatIssueList([makeIssue()], "markdown", null, { hasNextPage: false });
    expect(out).not.toContain("Pagination");
  });
});
