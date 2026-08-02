import { describe, expect, it, beforeAll } from "bun:test";

beforeAll(() => {
  process.env.BELIFOA_CONFIG_DIR = "/tmp/belifoa-unit-tests";
});

import {
  addProfile,
  switchProfile,
  listProfiles,
  switchDefaultTeam,
  getActiveProfile,
  removeProfile,
  getProjectConfig,
  detectProfileFromGitRemote,
} from "../src/core/config.js";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

describe("Belifoa Multi-Profile Auth & Switching", () => {
  it("adds, lists, and switches between multiple authentication profiles and workspaces", () => {
    addProfile("zuzu", "lin_api_zuzu_key_123", { id: "org-1", name: "Zuzu Inc", urlKey: "zuzu" }, "ENG");
    addProfile("myrehat", "lin_api_myrehat_key_456", { id: "org-2", name: "MyRehat Ltd", urlKey: "myrehat" }, "PROD");

    const profiles = listProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(2);

    switchProfile("myrehat");
    const activeMyRehat = getActiveProfile();
    expect(activeMyRehat?.name).toBe("myrehat");
    expect(activeMyRehat?.organization?.name).toBe("MyRehat Ltd");

    switchProfile("zuzu");
    const activeZuzu = getActiveProfile();
    expect(activeZuzu?.name).toBe("zuzu");
    expect(activeZuzu?.organization?.name).toBe("Zuzu Inc");
    expect(activeZuzu?.defaultTeam).toBe("ENG");
  });

  it("switches default team key for active profile", () => {
    switchProfile("zuzu");
    switchDefaultTeam("DEV");
    const active = getActiveProfile();
    expect(active?.defaultTeam).toBe("DEV");
  });

  it("removes profile cleanly", () => {
    addProfile("temp-test", "lin_api_temp", { id: "org-3", name: "Temp Org", urlKey: "temp" });
    switchProfile("temp-test");
    expect(getActiveProfile()?.name).toBe("temp-test");

    removeProfile("temp-test");
    expect(getActiveProfile()?.name).not.toBe("temp-test");
  });

  it("loads project config from .belifoa.json", () => {
    const testDir = "/tmp/test-belifoa-dot-json";
    mkdirSync(testDir, { recursive: true });
    const jsonPath = join(testDir, ".belifoa.json");
    writeFileSync(jsonPath, JSON.stringify({ profile: "myrehat", team: "REHAT" }));

    const projectConfig = getProjectConfig(testDir);
    expect(projectConfig?.profile).toBe("myrehat");
    expect(projectConfig?.team).toBe("REHAT");

    rmSync(testDir, { recursive: true, force: true });
  });

  it("auto-detects profile from git remote URL", () => {
    const config = {
      activeProfile: "default",
      profiles: {
        playzuzu: {
          name: "playzuzu",
          apiKey: "lin_api_zuzu",
          organization: { id: "org-1", name: "Playzuzu", urlKey: "zuzu" },
        },
        myrehat: {
          name: "myrehat",
          apiKey: "lin_api_myrehat",
          organization: { id: "org-2", name: "MyRehat", urlKey: "myrehat" },
        },
      },
    };

    // Current workspace git remote in /home/imbios/dev/projects/belifoa is git+https://github.com/ImBIOS/belifoa.git
    // detectProfileFromGitRemote returns null if no profile matches 'belifoa', or matches if profile name / org matches
    const detected = detectProfileFromGitRemote(config);
    expect(detected).toBeNull();
  });
});
