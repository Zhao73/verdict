// Claude Code backend: each call is one headless `claude -p` process using the user's own
// Claude Code sign-in. Structured results come back through --json-schema; web research uses
// Claude Code's WebSearch/WebFetch. No MCP servers are started, which keeps start-up fast.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { win32 } from "node:path";

export const CLAUDE_MODELS = { research: "sonnet", debate: "sonnet", decision: "opus", chat: "sonnet" };

export function claudeBin(env = process.env) {
  return resolveClaude(env.VERDICT_CLAUDE_BIN || "claude", { env });
}

/**
 * On Windows, `claude` is either claude.exe (native installer) or an npm shim, claude.cmd,
 * which Node cannot spawn without a shell (and a shell would mangle the JSON arguments). Find
 * the .exe, or read the shim for the script or binary it runs.
 */
export function resolveClaude(bin, { platform = process.platform, env = process.env, exists = existsSync, read = (f) => readFileSync(f, "utf8") } = {}) {
  if (platform !== "win32" || /\.(c|m)?js$/i.test(bin) || (/\.exe$/i.test(bin) && /[\\/]/.test(bin))) return bin;
  const named = /[\\/]/.test(bin);
  const name = win32.basename(bin).replace(/\.(cmd|exe|bat|ps1)$/i, "");
  const home = env.USERPROFILE || env.HOME || "";
  const dirs = named ? [win32.dirname(bin)] : [
    ...String(env.PATH || env.Path || "").split(";").filter(Boolean),
    home && win32.join(home, ".local", "bin"),
    env.APPDATA && win32.join(env.APPDATA, "npm"),
  ].filter(Boolean);
  for (const dir of dirs) {
    const exe = win32.join(dir, `${name}.exe`);
    if (exists(exe)) return exe;
    const shim = win32.join(dir, `${name}.cmd`);
    if (!exists(shim)) continue;
    let text = "";
    try {
      text = read(shim);
    } catch {
      continue;
    }
    const targets = [...text.matchAll(/%~?dp0%?\\([^"\r\n]+?\.(?:c|m)?js|[^"\r\n]+?\.exe)"/gi)].map((m) => win32.join(dir, m[1]));
    const target = targets.find((t) => !/node\.exe$/i.test(t) && exists(t));
    if (target) return target;
    const cli = win32.join(dir, "node_modules", "@anthropic-ai", "claude-code", "cli.js");
    if (exists(cli)) return cli;
  }
  return bin;
}

function launch(bin, args, opts) {
  // A path to Claude Code's cli.js (e.g. an npm install on Windows) runs through node.
  return /\.(c|m)?js$/.test(bin) ? spawn(process.execPath, [bin, ...args], opts) : spawn(bin, args, opts);
}

export function hasClaudeCli(env = process.env) {
  const bin = claudeBin(env);
  const r = /\.(c|m)?js$/.test(bin) ? spawnSync(process.execPath, [bin, "--version"], { encoding: "utf8" }) : spawnSync(bin, ["--version"], { encoding: "utf8" });
  return !r.error && r.status === 0 ? r.stdout.trim() : null;
}

function describeTool(block) {
  const input = block.input || {};
  if (block.name === "WebSearch") return `search: ${input.query || ""}`;
  if (block.name === "WebFetch") return `read: ${String(input.url || "").replace(/^https?:\/\//, "").slice(0, 70)}`;
  return block.name;
}

export function claudeArgs(req, model) {
  const tools = req.web ? "WebSearch,WebFetch" : "";
  const args = [
    "-p",
    "--output-format", "stream-json", "--verbose",
    "--system-prompt", req.system,
    "--model", model,
    "--tools", tools,
    "--allowedTools", tools,
    "--permission-mode", "dontAsk",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--disable-slash-commands",
  ];
  if (req.schema) args.push("--json-schema", JSON.stringify(req.schema));
  if (req.effort) args.push("--effort", req.effort);
  if (req.onText) args.push("--include-partial-messages");
  return args;
}

export function createClaudeBackend({ models = {}, bin = claudeBin() } = {}) {
  const resolved = { ...CLAUDE_MODELS, ...models };

  function call(req) {
    const model = resolved[req.tier] || resolved.research;
    const budget = req.web ? `\n\nKeep research focused: about ${req.maxSearches || 6} web searches, then answer.` : "";
    return new Promise((resolve, reject) => {
      const child = launch(bin, claudeArgs(req, model), { cwd: tmpdir(), env: process.env, stdio: ["pipe", "pipe", "pipe"] });
      let buf = "";
      let stderr = "";
      let result = null;
      let settled = false;
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        req.signal?.removeEventListener?.("abort", onAbort);
        fn();
      };
      const kill = (why) => {
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 2000).unref();
        finish(() => reject(new Error(why)));
      };
      const timer = setTimeout(() => kill(`timed out after ${Math.round((req.timeoutMs || 240_000) / 1000)}s`), req.timeoutMs || 240_000);
      const onAbort = () => kill("stopped");
      req.signal?.addEventListener?.("abort", onAbort, { once: true });

      child.stdin.on("error", () => {});
      child.stdin.end(`${req.user}${budget}`);
      child.stdout.on("data", (chunk) => {
        buf += chunk;
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "assistant") {
            for (const b of ev.message?.content || []) if (b.type === "tool_use") req.onActivity?.(describeTool(b));
          } else if (ev.type === "stream_event" && ev.event?.type === "content_block_delta") {
            // Structured output arrives as the input of a tool call; stream its JSON too.
            const delta = ev.event.delta || {};
            if (delta.type === "text_delta") req.onText?.(delta.text);
            else if (delta.type === "input_json_delta" && req.schema) req.onText?.(delta.partial_json);
          } else if (ev.type === "result") {
            result = ev;
          }
        }
      });
      child.stderr.on("data", (c) => {
        stderr = (stderr + c).slice(-1500);
      });
      child.on("error", (error) => finish(() => reject(new Error(error.code === "ENOENT" ? `Claude Code (\`${bin}\`) not found` : error.message))));
      child.on("close", (code) => finish(() => {
        if (!result) return reject(new Error(`claude exited ${code}${stderr ? `: ${stderr.trim().split("\n").pop()}` : ""}`));
        if (result.is_error || result.subtype !== "success") return reject(new Error(`claude: ${result.subtype}${result.result ? ` — ${String(result.result).slice(0, 200)}` : ""}`));
        const costUsd = result.total_cost_usd || 0;
        if (!req.schema) return resolve({ text: String(result.result || ""), costUsd, model });
        let data = result.structured_output;
        if (!data) {
          try {
            data = JSON.parse(String(result.result).replace(/^```(?:json)?\s*|```\s*$/g, ""));
          } catch {
            return reject(new Error("claude returned no structured output"));
          }
        }
        return resolve({ data, costUsd, model });
      }));
    });
  }

  return { name: "claude", models: resolved, call };
}
