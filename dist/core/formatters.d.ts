import type { LinearIssue, LinearTeam, LinearProject, OutputFormat, AuthProfile } from "./types.js";
export declare function getPriorityLabel(priority: number): string;
export declare function stripAnsi(str: string): string;
/**
 * Generate standard Linear git branch name slug (e.g., "imamuzzaki/ima-49-investigate-listing-issue")
 */
export declare function generateGitBranchName(issue: {
    identifier: string;
    title: string;
    assignee?: string;
}, userPrefix?: string): string;
/**
 * Clean raw GraphQL issue object into a normalized LinearIssue
 */
export declare function cleanRawIssue(node: any): LinearIssue;
/**
 * Format a 1-line context header active profile banner
 * e.g., "[belifoa] Active Profile: myrehat (Workspace: MyRehat, Default Team: MYR)"
 */
export declare function formatActiveProfileBanner(profile?: AuthProfile | null, format?: OutputFormat): string;
/**
 * Format a list of issues into compact agent or clean CLI terminal output
 */
export declare function formatIssueList(issues: LinearIssue[], format?: OutputFormat, activeProfile?: AuthProfile | null): string;
/**
 * Format a detailed single issue view
 */
export declare function formatIssueDetail(issue: LinearIssue, format?: OutputFormat, activeProfile?: AuthProfile | null): string;
/**
 * Format teams list
 */
export declare function formatTeams(teams: LinearTeam[], format?: OutputFormat, activeProfile?: AuthProfile | null): string;
/**
 * Format projects list
 */
export declare function formatProjects(projects: LinearProject[], format?: OutputFormat, activeProfile?: AuthProfile | null): string;
/**
 * Format list of saved authentication profiles & workspaces
 */
export declare function formatProfiles(profiles: Array<{
    profile: AuthProfile;
    isActive: boolean;
}>, format?: OutputFormat, activeProfile?: AuthProfile | null): string;
/**
 * Format labels list
 */
export declare function formatLabels(labels: Array<{
    id: string;
    name: string;
}>, format?: OutputFormat, activeProfile?: AuthProfile | null): string;
