import { describe, expect, it } from "bun:test";
import {
  cleanRawIssue,
  formatIssueList,
  formatIssueDetail,
  getPriorityLabel,
} from "../src/core/formatters.js";
import {
  RAW_LINEAR_SEARCH_RESPONSE,
  RAW_LINEAR_ISSUE_DETAIL_RESPONSE,
} from "../benchmark/mock-data.js";

describe("Belifoa Formatters", () => {
  it("converts priority numbers into readable labels", () => {
    expect(getPriorityLabel(1)).toContain("Urgent");
    expect(getPriorityLabel(2)).toContain("High");
    expect(getPriorityLabel(3)).toContain("Normal");
    expect(getPriorityLabel(4)).toContain("Low");
    expect(getPriorityLabel(0)).toBe("None");
  });

  it("cleans raw GraphQL issue node properly", () => {
    const rawNode = RAW_LINEAR_SEARCH_RESPONSE.data.issueSearch.nodes[0];
    const cleaned = cleanRawIssue(rawNode);

    expect(cleaned.identifier).toBe("ENG-101");
    expect(cleaned.title).toContain("authentication token refresh");
    expect(cleaned.status).toBe("In Progress");
    expect(cleaned.teamKey).toBe("ENG");
    expect(cleaned.assignee).toBe("ImBIOS");
    expect(cleaned.labels).toEqual(["bug", "security", "high-priority"]);
  });

  it("formats issue list into compact markdown table", () => {
    const cleanedList = RAW_LINEAR_SEARCH_RESPONSE.data.issueSearch.nodes.map(cleanRawIssue);
    const md = formatIssueList(cleanedList, "markdown");

    expect(md).toContain("| ID | Title | Status | Priority | Assignee | Labels |");
    expect(md).toContain("[ENG-101]");
    expect(md).toContain("In Progress");
    expect(md).toContain("@ImBIOS");
  });

  it("formats issue detail into detailed markdown card with comments", () => {
    const cleanedDetail = cleanRawIssue(RAW_LINEAR_ISSUE_DETAIL_RESPONSE.data.issue);
    const md = formatIssueDetail(cleanedDetail, "markdown");

    expect(md).toContain("# [ENG-102] Optimize Linear MCP output payloads");
    expect(md).toContain("- **Status**: Todo");
    expect(md).toContain("## Description");
    expect(md).toContain("## Comments (2)");
    expect(md).toContain("@ImBIOS");
  });

  it("formats compact JSON output stripping nulls and verbose metadata", () => {
    const cleanedList = RAW_LINEAR_SEARCH_RESPONSE.data.issueSearch.nodes.map(cleanRawIssue);
    const compactJsonStr = formatIssueList(cleanedList, "compact_json");
    const parsed = JSON.parse(compactJsonStr);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe("ENG-101");
    expect(parsed[0].__typename).toBeUndefined();
    expect(parsed[0].url).toBeUndefined();
  });
});
