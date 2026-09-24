// Settings the user chose, in ~/.verdict/config.json. Command-line flags always win over them.

import { join } from "node:path";
import { LANGUAGE_CODES, normalizeLanguage } from "../i18n/index.mjs";
import { homeDir, readJson, writeJson } from "./store.mjs";

export const DEFAULTS = { language: "auto", engine: "auto", mode: "deep" };

const KEYS = {
  language: (v) => {
    if (/^auto$/i.test(v)) return "auto";
    const code = normalizeLanguage(v);
    if (!LANGUAGE_CODES.includes(code) && !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(code)) throw new Error(`unknown language: ${v}`);
    return code;
  },
  engine: (v) => {
    if (!["auto", "api", "claude"].includes(v)) throw new Error("engine must be auto, api or claude");
    return v;
  },
  mode: (v) => {
    if (!["deep", "fast"].includes(v)) throw new Error("mode must be deep or fast");
    return v;
  },
};

const ALIAS = { lang: "language", l: "language", depth: "mode" };

const file = () => join(homeDir(), "config.json");

export function readConfig() {
  const saved = readJson(file()) || {};
  return { ...DEFAULTS, ...Object.fromEntries(Object.entries(saved).filter(([k]) => k in KEYS)) };
}

/** Validate and save one setting; returns the new config. */
export function setConfig(key, value) {
  const k = ALIAS[key] || key;
  if (!KEYS[k]) throw new Error(`unknown setting: ${key} (language, engine, mode)`);
  const next = { ...readConfig(), [k]: KEYS[k](String(value ?? "").trim()) };
  writeJson(file(), next);
  return next;
}

export function resetConfig() {
  writeJson(file(), { ...DEFAULTS });
  return { ...DEFAULTS };
}

/** The language a user picked, or null when it should follow what they type. */
export function chosenLanguage(config = readConfig()) {
  return config.language && config.language !== "auto" ? config.language : null;
}
