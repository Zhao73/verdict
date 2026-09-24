import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { fakeBackend, isolateHome } from "./helpers.mjs";

const home = isolateHome();
process.env.VERDICT_OFFLINE = "1";
const bin = fileURLToPath(new URL("../bin/verdict.mjs", import.meta.url));
const fake = fileURLToPath(new URL("./fake-backend.mjs", import.meta.url));
const { readConfig, setConfig, resetConfig, chosenLanguage } = await import("../src/engine/config.mjs");
const { languageOfText } = await import("../src/i18n/index.mjs");
const { resolveClaude } = await import("../src/models/claude.mjs");
const { App } = await import("../src/tui/app.mjs");

function verdict(args, env = {}) {
  const r = spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, VERDICT_HOME: home, VERDICT_OFFLINE: "1", VERDICT_BACKEND_MODULE: fake, NO_COLOR: "1", LANG: "en_US.UTF-8", ...env },
  });
  return { ...r, stdout: r.stdout.replace(/\x1b\[[0-9;]*m/g, "") };
}

test("settings: saved, validated, aliased and reset", () => {
  assert.deepEqual(readConfig(), { language: "auto", engine: "auto", mode: "deep" });
  assert.equal(setConfig("lang", "日本語").language, "ja");
  assert.equal(chosenLanguage(), "ja");
  assert.equal(setConfig("language", "繁體中文").language, "zh-TW");
  assert.equal(setConfig("mode", "fast").mode, "fast");
  assert.throws(() => setConfig("engine", "gpt"), /engine must be/);
  assert.throws(() => setConfig("colour", "red"), /unknown setting/);
  assert.equal(setConfig("language", "auto").language, "auto");
  assert.equal(chosenLanguage(), null);
  assert.deepEqual(resetConfig(), readConfig());
});

test("text reveals a language only when it clearly can", () => {
  assert.equal(languageOfText("NVDA"), null);
  assert.equal(languageOfText("トヨタ"), "ja");
  assert.equal(languageOfText("is it cheap now?"), "en");
  assert.equal(languageOfText("lohnt sich die Aktie jetzt?"), "de");
});

test("CLI: `verdict lang` saves the language every command then uses", () => {
  const set = verdict(["lang", "ja"]);
  assert.equal(set.status, 0, set.stderr);
  assert.match(set.stdout, /言語を保存しました: 日本語/);
  assert.match(verdict(["config"]).stdout, /language\s+ja/);
  const r = verdict(["TEST", "--plain", "--fresh"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /確信度/);
  // A flag still wins for one run.
  assert.match(verdict(["TEST", "--plain", "--fresh", "--lang", "ko"]).stdout, /확신도/);
  const list = verdict(["lang"]);
  assert.match(list.stdout, /日本語\s+ja\s+✓/);
  assert.match(list.stdout, /Nederlands/);
  assert.equal(verdict(["config", "engine", "nope"]).status, 1);
  assert.match(verdict(["config", "mode", "fast"]).stdout, /mode\s+fast/);
  assert.match(verdict(["lang", "auto"]).stdout, /✓/);
  verdict(["config", "reset"]);
});

test("app: /lang opens a picker; the choice is saved and applied", async () => {
  resetConfig();
  const a = new App({ cols: 110, rows: 32, backendFactory: async () => fakeBackend(), clock: () => new Date("2026-09-24T09:00:00") });
  a.stdin = {};
  await a.command("/lang");
  assert.match(a.buildFrame().plain(), /LANGUAGE/);
  assert.match(a.buildFrame().plain(), /한국어/);
  a.handleKey({ name: "down" });
  a.handleKey({ name: "down" });
  a.handleKey({ name: "enter" });
  assert.equal(readConfig().language, "zh-CN");
  assert.equal(a.language, "zh-CN");
  assert.match(a.buildFrame().plain(), /快速开始/);
  // A new session starts in the saved language.
  const b = new App({ cols: 110, rows: 32, backendFactory: async () => fakeBackend() });
  assert.equal(b.language, "zh-CN");
  assert.ok(b.languageLocked);
  await b.command("/lang auto");
  assert.equal(readConfig().language, "auto");
  assert.ok(!b.languageLocked);
});

test("Windows: Claude Code is found as claude.exe or through its npm shim", () => {
  const files = {
    "C:\\Users\\me\\AppData\\Roaming\\npm\\claude.cmd": '@ECHO off\r\nIF EXIST "%dp0%\\node.exe" (\r\n  SET "_prog=%dp0%\\node.exe"\r\n)\r\n"%_prog%"  "%dp0%\\node_modules\\@anthropic-ai\\claude-code\\cli.js" %*\r\n',
    "C:\\Users\\me\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js": "",
  };
  const fs = { exists: (f) => f in files, read: (f) => files[f] };
  const env = { PATH: "C:\\Windows\\system32;C:\\Users\\me\\AppData\\Roaming\\npm", USERPROFILE: "C:\\Users\\me", APPDATA: "C:\\Users\\me\\AppData\\Roaming" };
  assert.equal(resolveClaude("claude", { platform: "win32", env, ...fs }), "C:\\Users\\me\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js");
  files["C:\\Users\\me\\.local\\bin\\claude.exe"] = "";
  assert.equal(resolveClaude("claude", { platform: "win32", env: { ...env, PATH: "C:\\Windows\\system32" }, ...fs }), "C:\\Users\\me\\.local\\bin\\claude.exe", "native installer found even off PATH");
  assert.equal(resolveClaude("claude", { platform: "linux", env, ...fs }), "claude");
  assert.equal(resolveClaude("D:\\tools\\cli.js", { platform: "win32", env, ...fs }), "D:\\tools\\cli.js");
  assert.equal(resolveClaude("claude", { platform: "win32", env: { PATH: "" }, exists: () => false, read: () => "" }), "claude");
});
