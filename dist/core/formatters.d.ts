import type { LinearIssue, LinearTeam, LinearProject, OutputFormat, AuthProfile } from "./types.js";
export declare function getPriorityLabel(priority: number): string;
/**
 * Clean raw GraphQL issue object into a normalized LinearIssue
 */
export declare function cleanRawIssue(node: any): LinearIssue;
/**
 * Format a list of issues into compact agent or clean CLI terminal output
 */
export declare function formatIssueList(issues: LinearIssue[], format?: OutputFormat): string;
/**
 * Format a detailed single issue view
 */
export declare function formatIssueDetail(issue: LinearIssue, format?: OutputFormat): string;
/**
 * Format teams list
 */
export declare function formatTeams(teams: LinearTeam[], format?: OutputFormat): string;
/**
 * Format projects list
 */
export declare function formatProjects(projects: LinearProject[], format?: OutputFormat): string;
/**
 * Format list of saved authentication profiles & workspaces
 */
export declare function formatProfiles(profiles: Array<{
    profile: AuthProfile;
    isActive: boolean;
}>, format?: OutputFormat): string;
/**
 * Format labels list
 */
export declare function formatLabels(labels: Array<{
    id: string;
    name: string;
}>, format?: OutputFormat): string;
