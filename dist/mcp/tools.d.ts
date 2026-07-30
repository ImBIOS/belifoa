import { BelifoaClient } from "../core/client.js";
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
            commentBody: {
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
            format: {
                type: string;
                enum: string[];
                default: string;
            };
        };
    };
};
export declare function handleToolCall(name: string, args: any, client: BelifoaClient): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
}>;
