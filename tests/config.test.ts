import { describe, expect, it } from "bun:test";
import {
  addProfile,
  switchProfile,
  listProfiles,
  switchDefaultTeam,
  getActiveProfile,
  removeProfile,
} from "../src/core/config.js";

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
});
