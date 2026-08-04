import { type LinearIssue, type LinearTeam, type LinearProject, type LinearUser, type LinearOrganization, type CreateIssueParams, type UpdateIssueParams } from "./types.js";
export declare class BelifoaClient {
    private apiKey;
    private profileName?;
    constructor(apiKey?: string, profileName?: string);
    setApiKey(key: string): void;
    getApiKey(): string;
    private graphql;
    /**
     * Get authenticated user info
     */
    getMe(): Promise<LinearUser>;
    /**
     * Get current workspace organization info
     */
    getOrganization(): Promise<LinearOrganization>;
    /**
     * Get all workspace users
     */
    getUsers(): Promise<LinearUser[]>;
    /**
     * Get all issue labels in workspace
     */
    getIssueLabels(): Promise<Array<{
        id: string;
        name: string;
    }>>;
    /**
     * Get workflow states for a team
     */
    getTeamStates(teamId: string): Promise<Array<{
        id: string;
        name: string;
        type: string;
    }>>;
    /**
     * Resolve identifier (e.g. "ENG-123") or ID to Issue UUID
     */
    resolveIssueId(identifierOrId: string): Promise<string>;
    /**
     * Create an issue relation (e.g. blocking/blockedBy/duplicate)
     */
    createIssueRelation(issueId: string, relatedIssueId: string, type?: "blocks" | "duplicate" | "related"): Promise<boolean>;
    /**
     * Resolve assignee (id, email, or name) to User ID
     */
    resolveUserId(assigneeStr: string): Promise<string | undefined>;
    /**
     * Resolve project (id or name) to Project ID
     */
    resolveProjectId(projectStr: string): Promise<string | undefined>;
    /**
     * Resolve workflow state for a team to State ID
     */
    resolveStateId(teamId: string, stateStr: string): Promise<string | undefined>;
    /**
     * Resolve label names or IDs to Label IDs
     */
    resolveLabelIds(labelsInput: string[] | string): Promise<string[]>;
    /**
     * Search issues with query string or filters
     */
    searchIssues(queryStr: string, options?: {
        teamKey?: string;
        assigneeId?: string;
        limit?: number;
    }): Promise<LinearIssue[]>;
    /**
     * Get single issue by identifier (e.g., "ENG-123") or ID
     */
    getIssue(identifierOrId: string): Promise<LinearIssue>;
    /**
     * List issues assigned to the viewer
     */
    getMyIssues(limit?: number): Promise<LinearIssue[]>;
    /**
     * Create an issue
     */
    createIssue(params: CreateIssueParams): Promise<LinearIssue>;
    /**
     * Update an existing issue
     */
    updateIssue(id: string, params: UpdateIssueParams): Promise<LinearIssue>;
    /**
     * Bulk create issues
     */
    createBulkIssues(issues: CreateIssueParams[], defaultTeam?: string): Promise<{
        created: LinearIssue[];
        errors: Array<{
            index: number;
            title: string;
            error: string;
        }>;
    }>;
    /**
     * Add comment to an issue
     */
    addComment(issueId: string, body: string): Promise<{
        id: string;
        body: string;
    }>;
    /**
     * Get all teams
     */
    getTeams(): Promise<LinearTeam[]>;
    /**
     * Get all projects
     */
    getProjects(): Promise<LinearProject[]>;
}
