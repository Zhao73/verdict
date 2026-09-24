// Engine selection: API key first (fastest), Claude Code sign-in second.

import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

import { createClaudeBackend, hasClaudeCli } from "./claude.mjs";

export async function selectBackend({ engine = process.env.VERDICT_ENGINE || "auto", models = {}, env = process.env } = {}) {
  // A module path exporting createBackend() — used by the test suite to script model output.
  if (env.VERDICT_BACKEND_MODULE) {
    const spec = env.VERDICT_BACKEND_MODULE;
    // Windows paths (D:\...) are not valid import specifiers; file URLs are.
    return (await import(isAbsolute(spec) ? pathToFileURL(spec).href : spec)).createBackend({ models });
  }
  if (engine === "demo") return (await import("../demo.mjs")).createDemoBackend({ speed: Number(env.VERDICT_DEMO_SPEED || 1) });
  const hasKey = Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  if (engine === "api" || (engine === "auto" && hasKey)) {
    if (!hasKey) throw new Error("engine api needs ANTHROPIC_API_KEY");
    const { createApiBackend } = await import("./api.mjs");
    return createApiBackend({ models });
  }
  if (engine === "claude" || engine === "auto") {
    if (!hasClaudeCli(env)) {
      throw new Error(engine === "claude"
        ? "Claude Code not found: install it (npm i -g @anthropic-ai/claude-code) and sign in"
        : "No engine available: set ANTHROPIC_API_KEY, or install and sign in to Claude Code (npm i -g @anthropic-ai/claude-code)");
    }
    return createClaudeBackend({ models });
  }
  throw new Error(`unknown engine: ${engine} (use auto, api or claude)`);
}
