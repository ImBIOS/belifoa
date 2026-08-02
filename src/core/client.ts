import { loadConfig, getActiveProfile } from "./config.js";
import { cleanRawIssue } from "./formatters.js";
import type {
  LinearIssue,
  LinearTeam,
  LinearProject,
  LinearUser,
  LinearOrganization,
  CreateIssueParams,
  UpdateIssueParams,
} from "./types.js";

const LINEAR_GRAPHQL_ENDPOINT = "https://api.linear.app/graphql";

export class BelifoaClient {
  private apiKey: string;
  private profileName?: string;

  constructor(apiKey?: string, profileName?: string) {
    this.profileName = profileName;
    this.apiKey = apiKey || getActiveProfile(profileName)?.apiKey || "";
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
  }

  public getApiKey(): string {
    return this.apiKey || getActiveProfile(this.profileName)?.apiKey || "";
  }

  private async graphql<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    if (!this.apiKey) {
      this.apiKey = getActiveProfile(this.profileName)?.apiKey || "";
    }

    if (!this.apiKey) {
      throw new Error(
        "Linear API Key is missing! Set LINEAR_API_KEY environment variable, run `bun x github:ImBIOS/belifoa#main auth set <key>`, or call `linear_set_api_key` tool."
      );
    }

    const res = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Linear API HTTP Error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };

    if (json.errors && json.errors.length > 0) {
      throw new Error(`Linear GraphQL Error: ${json.errors.map((e) => e.message).join(", ")}`);
    }

    if (!json.data) {
      throw new Error("Linear GraphQL returned no data.");
    }

    return json.data;
  }

  /**
   * Get authenticated user info
   */
  async getMe(): Promise<LinearUser> {
    const query = `
      query Me {
        viewer {
          id
          name
          email
        }
      }
    `;
    const data = await this.graphql<{ viewer: LinearUser }>(query);
    return data.viewer;
  }

  /**
   * Get current workspace organization info
   */
  async getOrganization(): Promise<LinearOrganization> {
    const query = `
      query GetOrg {
        organization {
          id
          name
          urlKey
        }
      }
    `;
    const data = await this.graphql<{ organization: LinearOrganization }>(query);
    return data.organization;
  }

  /**
   * Get all workspace users
   */
  async getUsers(): Promise<LinearUser[]> {
    const query = `
      query GetUsers {
        users {
          nodes {
            id
            name
            email
          }
        }
      }
    `;
    const data = await this.graphql<{ users: { nodes: LinearUser[] } }>(query);
    return data.users?.nodes || [];
  }

  /**
   * Get all issue labels in workspace
   */
  async getIssueLabels(): Promise<Array<{ id: string; name: string }>> {
    const query = `
      query GetIssueLabels {
        issueLabels {
          nodes {
            id
            name
          }
        }
      }
    `;
    const data = await this.graphql<{ issueLabels: { nodes: Array<{ id: string; name: string }> } }>(query);
    return data.issueLabels?.nodes || [];
  }

  /**
   * Get workflow states for a team
   */
  async getTeamStates(teamId: string): Promise<Array<{ id: string; name: string; type: string }>> {
    const query = `
      query GetTeamStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    `;
    const data = await this.graphql<{ team: { states: { nodes: Array<{ id: string; name: string; type: string }> } } }>(
      query,
      { teamId }
    );
    return data.team?.states?.nodes || [];
  }

  /**
   * Resolve assignee (id, email, or name) to User ID
   */
  async resolveUserId(assigneeStr: string): Promise<string | undefined> {
    if (!assigneeStr) return undefined;
    if (assigneeStr.includes("-") && assigneeStr.length > 20) return assigneeStr;

    const users = await this.getUsers();
    const cleanStr = assigneeStr.replace(/^@/, "").toLowerCase();
    const match = users.find(
      (u) =>
        u.id === assigneeStr ||
        u.email?.toLowerCase() === cleanStr ||
        u.name.toLowerCase() === cleanStr ||
        u.name.toLowerCase().includes(cleanStr)
    );
    return match?.id;
  }

  /**
   * Resolve project (id or name) to Project ID
   */
  async resolveProjectId(projectStr: string): Promise<string | undefined> {
    if (!projectStr) return undefined;
    if (projectStr.includes("-") && projectStr.length > 20) return projectStr;

    const projects = await this.getProjects();
    const cleanStr = projectStr.toLowerCase();
    const match = projects.find(
      (p) => p.id === projectStr || p.name.toLowerCase() === cleanStr || p.name.toLowerCase().includes(cleanStr)
    );
    return match?.id;
  }

  /**
   * Resolve workflow state for a team to State ID
   */
  async resolveStateId(teamId: string, stateStr: string): Promise<string | undefined> {
    if (!stateStr) return undefined;
    if (stateStr.includes("-") && stateStr.length > 20) return stateStr;

    const states = await this.getTeamStates(teamId);
    const cleanStr = stateStr.toLowerCase();
    const match = states.find(
      (s) => s.id === stateStr || s.name.toLowerCase() === cleanStr || s.type.toLowerCase() === cleanStr
    );
    return match?.id;
  }

  /**
   * Resolve label names or IDs to Label IDs
   */
  async resolveLabelIds(labelsInput: string[] | string): Promise<string[]> {
    if (!labelsInput) return [];
    const labelsArr = typeof labelsInput === "string"
      ? labelsInput.split(",").map((s) => s.trim()).filter(Boolean)
      : labelsInput;

    if (labelsArr.length === 0) return [];

    const resultIds: string[] = [];
    const unresolvedNames: string[] = [];

    for (const label of labelsArr) {
      if (label.includes("-") && label.length > 20) {
        resultIds.push(label);
      } else {
        unresolvedNames.push(label.toLowerCase());
      }
    }

    if (unresolvedNames.length > 0) {
      const allLabels = await this.getIssueLabels();
      for (const name of unresolvedNames) {
        const match = allLabels.find((l) => l.id === name || l.name.toLowerCase() === name);
        if (match) resultIds.push(match.id);
      }
    }

    return resultIds;
  }

  /**
   * Search issues with query string or filters
   */
  async searchIssues(
    queryStr: string,
    options: { teamKey?: string; assigneeId?: string; limit?: number } = {}
  ): Promise<LinearIssue[]> {
    const limit = options.limit || 15;
    const query = `
      query SearchIssues($term: String!, $first: Int) {
        issueSearch(query: $term, first: $first) {
          nodes {
            id
            identifier
            title
            description
            priority
            estimate
            dueDate
            url
            createdAt
            updatedAt
            state { name }
            team { key }
            assignee { name email }
            project { name }
            labels { nodes { name } }
          }
        }
      }
    `;

    const data = await this.graphql<{ issueSearch: { nodes: any[] } }>(query, {
      term: queryStr,
      first: limit,
    });

    let nodes = data.issueSearch.nodes || [];
    if (options.teamKey) {
      nodes = nodes.filter((n) => n.team?.key?.toUpperCase() === options.teamKey?.toUpperCase());
    }

    return nodes.map(cleanRawIssue);
  }

  /**
   * Get single issue by identifier (e.g., "ENG-123") or ID
   */
  async getIssue(identifierOrId: string): Promise<LinearIssue> {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          priority
          estimate
          dueDate
          url
          createdAt
          updatedAt
          state { name }
          team { key }
          assignee { name email }
          project { name }
          labels { nodes { name } }
          comments(first: 20) {
            nodes {
              id
              body
              createdAt
              user { id name email }
            }
          }
        }
      }
    `;

    const data = await this.graphql<{ issue: any }>(query, { id: identifierOrId });
    if (!data.issue) {
      throw new Error(`Issue not found: ${identifierOrId}`);
    }
    return cleanRawIssue(data.issue);
  }

  /**
   * List issues assigned to the viewer
   */
  async getMyIssues(limit: number = 20): Promise<LinearIssue[]> {
    const query = `
      query MyIssues($first: Int) {
        viewer {
          assignedIssues(first: $first, orderBy: updatedAt) {
            nodes {
              id
              identifier
              title
              description
              priority
              estimate
              dueDate
              url
              createdAt
              updatedAt
              state { name }
              team { key }
              assignee { name email }
              project { name }
              labels { nodes { name } }
            }
          }
        }
      }
    `;

    const data = await this.graphql<{ viewer: { assignedIssues: { nodes: any[] } } }>(query, {
      first: limit,
    });

    return (data.viewer?.assignedIssues?.nodes || []).map(cleanRawIssue);
  }

  /**
   * Create an issue
   */
  async createIssue(params: CreateIssueParams): Promise<LinearIssue> {
    let teamId = params.teamIdOrKey;
    if (!params.teamIdOrKey.includes("-") || params.teamIdOrKey.length < 10) {
      const teams = await this.getTeams();
      const match = teams.find(
        (t) => t.key.toUpperCase() === params.teamIdOrKey.toUpperCase() || t.id === params.teamIdOrKey
      );
      if (match) teamId = match.id;
    }

    const assigneeId = params.assignee ? await this.resolveUserId(params.assignee) : undefined;
    const projectId = params.project ? await this.resolveProjectId(params.project) : undefined;
    const stateId = params.state ? await this.resolveStateId(teamId, params.state) : undefined;
    const labelIds = params.labels ? await this.resolveLabelIds(params.labels) : undefined;

    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            priority
            estimate
            dueDate
            url
            createdAt
            state { name }
            team { key }
            assignee { name email }
            project { name }
            labels { nodes { name } }
          }
        }
      }
    `;

    const input: Record<string, any> = {
      teamId,
      title: params.title,
      description: params.description,
      priority: params.priority !== undefined ? Number(params.priority) : 0,
      assigneeId,
      projectId,
      stateId,
      estimate: params.estimate !== undefined ? Number(params.estimate) : undefined,
      dueDate: params.dueDate,
      labelIds,
    };

    Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);

    const data = await this.graphql<{ issueCreate: { success: boolean; issue: any } }>(mutation, { input });
    if (!data.issueCreate.success || !data.issueCreate.issue) {
      throw new Error("Failed to create Linear issue.");
    }

    return cleanRawIssue(data.issueCreate.issue);
  }

  /**
   * Update an existing issue
   */
  async updateIssue(id: string, params: UpdateIssueParams): Promise<LinearIssue> {
    const existing = await this.getIssue(id).catch(() => undefined);
    const teamId = existing?.teamKey
      ? (await this.getTeams()).find((t) => t.key === existing.teamKey)?.id
      : undefined;

    const assigneeId = params.assignee ? await this.resolveUserId(params.assignee) : undefined;
    const projectId = params.project ? await this.resolveProjectId(params.project) : undefined;
    const stateId = params.state && teamId ? await this.resolveStateId(teamId, params.state) : undefined;
    const labelIds = params.labels ? await this.resolveLabelIds(params.labels) : undefined;

    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            priority
            estimate
            dueDate
            url
            updatedAt
            state { name }
            team { key }
            assignee { name email }
            project { name }
            labels { nodes { name } }
          }
        }
      }
    `;

    const input: Record<string, any> = {
      title: params.title,
      description: params.description,
      priority: params.priority !== undefined ? Number(params.priority) : undefined,
      assigneeId,
      projectId,
      stateId,
      estimate: params.estimate !== undefined ? Number(params.estimate) : undefined,
      dueDate: params.dueDate,
      labelIds,
    };

    Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);

    const data = await this.graphql<{ issueUpdate: { success: boolean; issue: any } }>(mutation, {
      id: existing?.id || id,
      input,
    });

    if (!data.issueUpdate.success || !data.issueUpdate.issue) {
      throw new Error(`Failed to update issue ${id}`);
    }

    return cleanRawIssue(data.issueUpdate.issue);
  }

  /**
   * Bulk create issues
   */
  async createBulkIssues(
    issues: CreateIssueParams[],
    defaultTeam?: string
  ): Promise<{ created: LinearIssue[]; errors: Array<{ index: number; title: string; error: string }> }> {
    const created: LinearIssue[] = [];
    const errors: Array<{ index: number; title: string; error: string }> = [];

    for (let i = 0; i < issues.length; i++) {
      const item = issues[i];
      try {
        const teamKey = item.teamIdOrKey || defaultTeam;
        if (!teamKey) {
          throw new Error("Missing team key/ID in issue item and no default team provided.");
        }

        const issue = await this.createIssue({
          ...item,
          teamIdOrKey: teamKey,
        });
        created.push(issue);
      } catch (err: any) {
        errors.push({
          index: i,
          title: item.title || `Issue #${i + 1}`,
          error: err.message || "Unknown error",
        });
      }
    }

    return { created, errors };
  }

  /**
   * Add comment to an issue
   */
  async addComment(issueId: string, body: string): Promise<{ id: string; body: string }> {
    const mutation = `
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            createdAt
          }
        }
      }
    `;

    const data = await this.graphql<{ commentCreate: { success: boolean; comment: any } }>(mutation, {
      input: { issueId, body },
    });

    if (!data.commentCreate.success || !data.commentCreate.comment) {
      throw new Error(`Failed to create comment on issue ${issueId}`);
    }

    return data.commentCreate.comment;
  }

  /**
   * Get all teams
   */
  async getTeams(): Promise<LinearTeam[]> {
    const query = `
      query GetTeams {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;
    const data = await this.graphql<{ teams: { nodes: LinearTeam[] } }>(query);
    return data.teams?.nodes || [];
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<LinearProject[]> {
    const query = `
      query GetProjects {
        projects {
          nodes {
            id
            name
            state
            progress
          }
        }
      }
    `;
    const data = await this.graphql<{ projects: { nodes: LinearProject[] } }>(query);
    return data.projects?.nodes || [];
  }
}
