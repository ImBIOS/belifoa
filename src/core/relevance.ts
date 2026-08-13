import type { LinearIssue } from "./types.js";

export interface RelevanceMatch {
  score: number;
  title: string[];
  description: string[];
  labels: string[];
  comments: string[];
  identifier: boolean;
}

const TITLE_WEIGHT = 4;
const DESCRIPTION_WEIGHT = 2;
const LABEL_WEIGHT = 2;
const COMMENT_WEIGHT = 1;
const IDENTIFIER_WEIGHT = 8;
const COVERAGE_BONUS = 1;
const TITLE_PHRASE_BONUS = 10;
const DESCRIPTION_PHRASE_BONUS = 5;
const COMMENT_PHRASE_BONUS = 2;

export function tokenizeSearchQuery(query: string): string[] {
  return (query.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 1);
}

export function scoreIssueRelevance(issue: LinearIssue, tokens: string[], rawQuery?: string): RelevanceMatch {
  const title = (issue.title || "").toLowerCase();
  const description = (issue.description || "").toLowerCase();
  const labels = (issue.labels || []).join(" ").toLowerCase();
  const comments = (issue.comments || []).map((c) => c.body || "").join("\n").toLowerCase();
  const identifier = (issue.identifier || "").toLowerCase();

  const match: RelevanceMatch = {
    score: 0,
    title: [],
    description: [],
    labels: [],
    comments: [],
    identifier: false,
  };

  for (const tok of tokens) {
    if (identifier.includes(tok)) {
      match.identifier = true;
      match.score += IDENTIFIER_WEIGHT;
    }
    if (title.includes(tok)) {
      match.title.push(tok);
      match.score += TITLE_WEIGHT;
    }
    if (description.includes(tok)) {
      match.description.push(tok);
      match.score += DESCRIPTION_WEIGHT;
    }
    if (labels.includes(tok)) {
      match.labels.push(tok);
      match.score += LABEL_WEIGHT;
    }
    if (comments.includes(tok)) {
      match.comments.push(tok);
      match.score += COMMENT_WEIGHT;
    }
    if (
      match.identifier ||
      match.title.includes(tok) ||
      match.description.includes(tok) ||
      match.labels.includes(tok) ||
      match.comments.includes(tok)
    ) {
      match.score += COVERAGE_BONUS;
    }
  }

  if (rawQuery) {
    const phrase = rawQuery.toLowerCase();
    if (tokens.length > 1) {
      if (title.includes(phrase)) match.score += TITLE_PHRASE_BONUS;
      if (description.includes(phrase)) match.score += DESCRIPTION_PHRASE_BONUS;
      if (comments.includes(phrase)) match.score += COMMENT_PHRASE_BONUS;
    }
  }

  return match;
}

export function buildMatchContext(match: RelevanceMatch): string | undefined {
  const parts: string[] = [];
  if (match.identifier) parts.push("id");
  if (match.title.length > 0) parts.push(`t:${match.title.join(",")}`);
  if (match.description.length > 0) parts.push(`d:${match.description.join(",")}`);
  if (match.labels.length > 0) parts.push(`l:${match.labels.join(",")}`);
  if (match.comments.length > 0) parts.push(`c:${match.comments.join(",")}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
