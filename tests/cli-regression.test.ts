import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const cliPath = join(import.meta.dir, "..", "src", "cli", "index.ts");

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf-8",
    env: { ...process.env, BELIFOA_CONFIG_DIR: "/tmp/belifoa-unit-tests" },
  });
}

describe("CLI option registration", () => {
  const commands = [
    "auth",
    "branch",
    "create",
    "delete",
    "issue",
    "labels",
    "mcp",
    "my-issues",
    "projects",
    "search",
    "teams",
    "update",
    "workspace",
    "install-bin",
  ];

  it.each(commands)("registers %s without commander errors", (cmd) => {
    const { status, stderr, stdout } = runCli(cmd, "--help");
    expect(status).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Usage:");
  });

  it("parses root --help without commander errors", () => {
    const { status, stderr, stdout } = runCli("--help");
    expect(status).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("belifoa");
  });
});
