import { loadConfig, getActiveProfile } from "./config.js";
import { cleanRawIssue } from "./formatters.js";
import type { LinearIssue, LinearTeam, LinearProject, LinearUser, LinearOrganization } from "./types.js";

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
  async createIssue(params: {
    teamIdOrKey: string;
    title: string;
    description?: string;
    priority?: number;
    assigneeId?: string;
    stateId?: string;
  }): Promise<LinearIssue> {
    // First, resolve team ID if key is passed (e.g. "ENG")
    let teamId = params.teamIdOrKey;
    if (!params.teamIdOrKey.includes("-") && params.teamIdOrKey.length < 10) {
      const teams = await this.getTeams();
      const match = teams.find((t) => t.key.toUpperCase() === params.teamIdOrKey.toUpperCase());
      if (match) teamId = match.id;
    }

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
            url
            createdAt
            state { name }
            team { key }
            assignee { name email }
          }
        }
      }
    `;

    const input: Record<string, any> = {
      teamId,
      title: params.title,
      description: params.description,
      priority: params.priority ?? 0,
      assigneeId: params.assigneeId,
      stateId: params.stateId,
    };

    const data = await this.graphql<{ issueCreate: { success: boolean; issue: any } }>(mutation, { input });
    if (!data.issueCreate.success || !data.issueCreate.issue) {
      throw new Error("Failed to create Linear issue.");
    }

    return cleanRawIssue(data.issueCreate.issue);
  }

  /**
   * Update an existing issue
   */
  async updateIssue(
    id: string,
    params: {
      title?: string;
      description?: string;
      priority?: number;
      stateId?: string;
      assigneeId?: string;
    }
  ): Promise<LinearIssue> {
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
            url
            updatedAt
            state { name }
            team { key }
            assignee { name email }
          }
        }
      }
    `;

    const data = await this.graphql<{ issueUpdate: { success: boolean; issue: any } }>(mutation, {
      id,
      input: params,
    });

    if (!data.issueUpdate.success || !data.issueUpdate.issue) {
      throw new Error(`Failed to update issue ${id}`);
    }

    return cleanRawIssue(data.issueUpdate.issue);
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
