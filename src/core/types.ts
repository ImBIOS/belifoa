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
  identifier: string; // e.g. "ENG-123"
  title: string;
  description?: string;
  priority: number; // 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
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
  parent?: { id: string; identifier: string; title: string };
  children?: Array<{ id: string; identifier: string; title: string; status?: string; priority?: number }>;
  relations?: Array<{ id: string; type: string; relatedIssue: { id: string; identifier: string; title: string } }>;
  gitBranchName?: string;
}

export interface CreateIssueParams {
  teamIdOrKey: string;
  title: string;
  description?: string;
  priority?: number;
  assignee?: string; // id, email, or name
  project?: string; // id or name
  estimate?: number; // story points (1, 2, 3, 5, 8, etc.)
  dueDate?: string; // YYYY-MM-DD
  labels?: string[] | string; // label names or ids
  state?: string; // stateId or state name (e.g., "In Progress", "Todo")
  parentId?: string; // Parent issue ID or identifier (e.g., "ENG-100")
  blockedBy?: string[] | string; // Issue ID(s) or identifier(s) that block this issue
  blocks?: string[] | string; // Issue ID(s) or identifier(s) that this issue blocks
  checkExisting?: boolean; // If true, check if issue with same title exists in team before creating
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
  parentId?: string; // Parent issue ID or identifier
  blockedBy?: string[] | string;
  blocks?: string[] | string;
}

export class BelifoaSuggestionError extends Error {
  public suggestions: Record<string, any>;

  constructor(message: string, suggestions: Record<string, any>) {
    super(message);
    this.name = "BelifoaSuggestionError";
    this.suggestions = suggestions;
  }
}

export type OutputFormat = "markdown" | "compact_json" | "raw_json" | "cli_table";

export interface AuthProfile {
  name: string; // Profile identifier, e.g., "zuzu", "myrehat", "orderly"
  apiKey: string;
  organization?: LinearOrganization;
  teams?: Array<{ key: string; name: string }>;
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
