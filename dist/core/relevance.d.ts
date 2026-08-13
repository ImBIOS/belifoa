import type { LinearIssue } from "./types.js";
export interface RelevanceMatch {
    score: number;
    title: string[];
    description: string[];
    labels: string[];
    comments: string[];
    identifier: boolean;
}
export declare function tokenizeSearchQuery(query: string): string[];
export declare function scoreIssueRelevance(issue: LinearIssue, tokens: string[], rawQuery?: string): RelevanceMatch;
export declare function buildMatchContext(match: RelevanceMatch): string | undefined;
