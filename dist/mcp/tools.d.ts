import { BelifoaClient } from "../core/client.js";
export declare const authStatusToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            profileName: {
                type: string;
                description: string;
            };
        };
    };
};
export declare const authListToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            format: {
                type: string;
                enum: string[];
                default: string;
            };
        };
    };
};
export declare const authSwitchToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            profileName: {
                type: string;
                description: string;
            };
            teamKey: {
                type: string;
                description: string;
            };
        };
    };
};
export declare const setApiKeyToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            apiKey: {
                type: string;
                description: string;
            };
            profileName: {
                type: string;
                description: string;
            };
            teamKey: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const getIssueToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            id: {
                type: string;
                description: string;
            };
            profileName: {
                type: string;
                description: string;
            };
            format: {
                type: string;
                enum: string[];
                default: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const searchIssuesToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            profileName: {
                type: string;
                description: string;
            };
            teamKey: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                default: number;
                description: string;
            };
            format: {
                type: string;
                enum: string[];
                default: string;
            };
        };
        required: string[];
    };
};
export declare const getMyIssuesToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            profileName: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                default: number;
            };
            format: {
                type: string;
                enum: string[];
                default: string;
            };
        };
    };
};
export declare const manageIssueToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            action: {
                type: string;
                enum: string[];
                description: string;
            };
            profileName: {
                type: string;
                description: string;
            };
            issueId: {
                type: string;
                description: string;
            };
            teamKey: {
                type: string;
                description: string;
            };
            title: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            priority: {
                type: string;
                description: string;
            };
            assignee: {
                type: string;
                description: string;
            };
            project: {
                type: string;
                description: string;
            };
            estimate: {
                type: string;
                description: string;
            };
            dueDate: {
                type: string;
                description: string;
            };
            labels: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            state: {
                type: string;
                description: string;
            };
            parentId: {
                type: string;
                description: string;
            };
            blockedBy: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            blocks: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            commentBody: {
                type: string;
                description: string;
            };
            issues: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        team: {
                            type: string;
                        };
                        title: {
                            type: string;
                        };
                        description: {
                            type: string;
                        };
                        priority: {
                            type: string;
                        };
                        assignee: {
                            type: string;
                        };
                        project: {
                            type: string;
                        };
                        estimate: {
                            type: string;
                        };
                        dueDate: {
                            type: string;
                        };
                        labels: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                        state: {
                            type: string;
                        };
                        parentId: {
                            type: string;
                        };
                        blockedBy: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                        blocks: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                    required: string[];
                };
                description: string;
            };
            format: {
                type: string;
                enum: string[];
                default: string;
            };
        };
        required: string[];
    };
};
export declare const bulkCreateIssuesToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            issues: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        team: {
                            type: string;
                            description: string;
                        };
                        title: {
                            type: string;
                            description: string;
                        };
                        description: {
                            type: string;
                            description: string;
                        };
                        priority: {
                            type: string;
                            description: string;
                        };
                        assignee: {
                            type: string;
                            description: string;
                        };
                        project: {
                            type: string;
                            description: string;
                        };
                        estimate: {
                            type: string;
                            description: string;
                        };
                        dueDate: {
                            type: string;
                            description: string;
                        };
                        labels: {
                            type: string;
                            items: {
                                type: string;
                            };
                            description: string;
                        };
                        state: {
                            type: string;
                            description: string;
                        };
                        parentId: {
                            type: string;
                            description: string;
                        };
                        blockedBy: {
                            type: string;
                            items: {
                                type: string;
                            };
                            description: string;
                        };
                        blocks: {
                            type: string;
                            items: {
                                type: string;
                            };
                            description: string;
                        };
                    };
                    required: string[];
                };
                description: string;
            };
            defaultTeamKey: {
                type: string;
                description: string;
            };
            profileName: {
                type: string;
                description: string;
            };
            format: {
                type: string;
                enum: string[];
                default: string;
            };
        };
        required: string[];
    };
};
export declare const getTeamsAndProjectsToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            profileName: {
                type: string;
                description: string;
            };
            format: {
                type: string;
                enum: string[];
                default: string;
            };
        };
    };
};
export declare const getLabelsToolSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            profileName: {
                type: string;
                description: string;
            };
            format: {
                type: string;
                enum: string[];
                default: string;
            };
        };
    };
};
export declare function getAuthGuidanceMessage(): string;
export declare function handleToolCall(name: string, args: any, client: BelifoaClient): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
}>;
