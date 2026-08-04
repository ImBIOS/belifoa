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
    estimate?: number;
    dueDate?: string;
    url?: string;
    createdAt?: string;
    updatedAt?: string;
    comments?: LinearComment[];
    parent?: {
        id: string;
        identifier: string;
        title: string;
    };
    children?: Array<{
        id: string;
        identifier: string;
        title: string;
        status?: string;
        priority?: number;
    }>;
    relations?: Array<{
        id: string;
        type: string;
        relatedIssue: {
            id: string;
            identifier: string;
            title: string;
        };
    }>;
    gitBranchName?: string;
}
export interface CreateIssueParams {
    teamIdOrKey: string;
    title: string;
    description?: string;
    priority?: number;
    assignee?: string;
    project?: string;
    estimate?: number;
    dueDate?: string;
    labels?: string[] | string;
    state?: string;
    parentId?: string;
    blockedBy?: string[] | string;
    blocks?: string[] | string;
}
export interface UpdateIssueParams {
    title?: string;
    description?: string;
    priority?: number;
    assignee?: string;
    project?: string;
    estimate?: number;
    dueDate?: string;
    labels?: string[] | string;
    state?: string;
    parentId?: string;
    blockedBy?: string[] | string;
    blocks?: string[] | string;
}
export declare class BelifoaSuggestionError extends Error {
    suggestions: Record<string, any>;
    constructor(message: string, suggestions: Record<string, any>);
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
    defaultAssignee?: string;
    remotes?: string[];
    createdAt?: string;
}
export interface BelifoaConfig {
    activeProfile?: string;
    profiles: Record<string, AuthProfile>;
    defaultFormat?: OutputFormat;
}
