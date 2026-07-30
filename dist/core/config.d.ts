import type { BelifoaConfig, AuthProfile, LinearOrganization } from "./types.js";
export declare function loadConfig(): BelifoaConfig;
export declare function saveConfig(config: BelifoaConfig): void;
export declare function getActiveProfile(): AuthProfile | null;
export declare function addProfile(name: string, apiKey: string, organization?: LinearOrganization, defaultTeam?: string): AuthProfile;
export declare function switchProfile(name: string): AuthProfile;
export declare function switchDefaultTeam(teamKey: string, profileName?: string): AuthProfile;
export declare function removeProfile(name: string): void;
export declare function listProfiles(): Array<{
    profile: AuthProfile;
    isActive: boolean;
}>;
