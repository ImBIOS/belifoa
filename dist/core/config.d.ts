import type { BelifoaConfig } from "./types.js";
export declare function loadConfig(): BelifoaConfig;
export declare function saveConfig(config: Partial<BelifoaConfig>): void;
export declare function resolveApiKey(): string;
