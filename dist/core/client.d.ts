import type { LinearIssue, LinearTeam, LinearProject, LinearUser } from "./types.js";
export declare class BelifoaClient {
    private apiKey;
    constructor(apiKey?: string);
    private graphql;
    /**
     * Get authenticated user info
     */
    getMe(): Promise<LinearUser>;
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
    createIssue(params: {
        teamIdOrKey: string;
        title: string;
        description?: string;
        priority?: number;
        assigneeId?: string;
        stateId?: string;
    }): Promise<LinearIssue>;
    /**
     * Update an existing issue
     */
    updateIssue(id: string, params: {
        title?: string;
        description?: string;
        priority?: number;
        stateId?: string;
        assigneeId?: string;
    }): Promise<LinearIssue>;
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
