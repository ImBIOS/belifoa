import type { BelifoaConfig, AuthProfile, LinearOrganization } from "./types.js";
export declare function loadConfig(): BelifoaConfig;
export declare function saveConfig(config: BelifoaConfig): void;
/**
 * Search upwards for project-local .belifoarc.json or .belifoa configuration
 */
export declare function getProjectConfig(startDir?: string): {
    profile?: string;
    team?: string;
    apiKey?: string;
} | null;
/**
 * Save project-local .belifoarc.json in target or current directory
 */
export declare function saveProjectConfig(projectDir: string, configData: {
    profile?: string;
    team?: string;
}): void;
/**
 * Get active profile with strict isolation hierarchy:
 * 1. Explicit overrideProfileName (CLI flag --profile / tool parameter)
 * 2. Environment variable BELIFOA_PROFILE
 * 3. Project-local configuration (.belifoarc.json in current directory tree)
 * 4. Global ~/.config/belifoa/config.json activeProfile (Fallback)
 */
export declare function getActiveProfile(overrideProfileName?: string): AuthProfile | null;
export declare function addProfile(name: string, apiKey: string, organization?: LinearOrganization, defaultTeam?: string, teams?: Array<{
    key: string;
    name: string;
}>): AuthProfile;
export declare function switchProfile(name: string): AuthProfile;
export declare function switchDefaultTeam(teamKey: string, profileName?: string): AuthProfile;
export declare function removeProfile(name: string): void;
export declare function listProfiles(): Array<{
    profile: AuthProfile;
    isActive: boolean;
}>;
