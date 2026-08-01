export interface LinearUser {
    id: string;
    name: string;
    email?: string;
}
export interface LinearOrganization {
    id: string;
    name: string;
    urlKey: string;
}
export interface LinearState {
    id: string;
    name: string;
    type: string;
    color?: string;
}
export interface LinearTeam {
    id: string;
    name: string;
    key: string;
}
export interface LinearProject {
    id: string;
    name: string;
    state?: string;
    progress?: number;
}
export interface LinearComment {
    id: string;
    body: string;
    createdAt: string;
    user?: LinearUser;
}
export interface LinearIssue {
    id: string;
    identifier: string;
    title: string;
    description?: string;
    priority: number;
    priorityLabel?: string;
    status: string;
    teamKey?: string;
    assignee?: string;
    project?: string;
    labels?: string[];
    url?: string;
    createdAt?: string;
    updatedAt?: string;
    comments?: LinearComment[];
}
export type OutputFormat = "markdown" | "compact_json" | "raw_json" | "cli_table";
export interface AuthProfile {
    name: string;
    apiKey: string;
    organization?: LinearOrganization;
    teams?: Array<{
        key: string;
        name: string;
    }>;
    defaultTeam?: string;
    createdAt?: string;
}
export interface BelifoaConfig {
    activeProfile?: string;
    profiles: Record<string, AuthProfile>;
    defaultFormat?: OutputFormat;
}
