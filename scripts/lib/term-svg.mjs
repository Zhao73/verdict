// Terminal lines (ANSI) → a crisp SVG "window". Every word is placed at its own cell column so
// runs of spaces and double-width CJK glyphs line up exactly. Used by shots.mjs and video.mjs.

import { width } from "../../src/render/terminal.mjs";

const CELL_W = 8.43;
const LINE_H = 18.5;
const PAD = 18;
const BAR = 30;

export function parseAnsi(line) {
  const runs = [];
  let st = { fg: null, bg: null, bold: false, italic: false, underline: false, inverse: false };
  let text = "";
  const push = () => {
    if (text) runs.push({ text, ...st });
    text = "";
  };
  for (let i = 0; i < line.length;) {
    const m = /^\x1b\[([0-9;]*)m/.exec(line.slice(i));
    if (m) {
      push();
      const p = m[1].split(";").filter((x) => x !== "").map(Number);
      if (!p.length) st = { ...st, fg: null, bg: null, bold: false, italic: false, underline: false, inverse: false };
      for (let k = 0; k < p.length; k += 1) {
        const n = p[k];
        if (n === 0) st = { fg: null, bg: null, bold: false, italic: false, underline: false, inverse: false };
        else if (n === 1) st = { ...st, bold: true };
        else if (n === 3) st = { ...st, italic: true };
        else if (n === 4) st = { ...st, underline: true };
        else if (n === 7) st = { ...st, inverse: true };
        else if ((n === 38 || n === 48) && p[k + 1] === 2) {
          const hex = `#${p.slice(k + 2, k + 5).map((x) => x.toString(16).padStart(2, "0")).join("")}`;
          st = { ...st, [n === 38 ? "fg" : "bg"]: hex };
          k += 4;
        }
      }
      i += m[0].length;
      continue;
    }
    const ch = String.fromCodePoint(line.codePointAt(i));
    text += ch;
    i += ch.length;
  }
  push();
  return runs;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function toSvg(lines, { cols, title }) {
  const w = Math.round(cols * CELL_W + PAD * 2);
  const h = Math.round(lines.length * LINE_H + PAD * 2 + BAR);
  const body = [];
  lines.forEach((line, row) => {
    let col = 0;
    const y = BAR + PAD + row * LINE_H;
    for (const r of parseAnsi(line)) {
      const cw = width(r.text);
      const x = PAD + col * CELL_W;
      let fg = r.fg || "#c9c5bb";
      let bg = r.bg;
      if (r.inverse) [fg, bg] = [bg || "#0f1115", fg];
      if (bg) body.push(`<rect x="${x.toFixed(1)}" y="${(y - 1).toFixed(1)}" width="${(cw * CELL_W + 0.6).toFixed(1)}" height="${LINE_H + 0.5}" fill="${bg}"/>`);
      // Place every word at its own cell column: SVG would collapse runs of spaces.
      let sub = col;
      for (const part of r.text.split(/(\s+)/)) {
        const pw = width(part);
        if (part.trim()) body.push(`<text x="${(PAD + sub * CELL_W).toFixed(1)}" y="${(y + 13.5).toFixed(1)}" fill="${fg}"${r.bold ? ' font-weight="700"' : ""}${r.italic ? ' font-style="italic"' : ""}${r.underline ? ' text-decoration="underline"' : ""} textLength="${(pw * CELL_W).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(part)}</text>`);
        sub += pw;
      }
      col += cw;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="'JetBrains Mono','SFMono-Regular',Menlo,Consolas,'DejaVu Sans Mono',monospace" font-size="14" xml:space="preserve">
<rect width="${w}" height="${h}" rx="12" fill="#0f1115"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="none" stroke="#262a33"/>
<circle cx="22" cy="17" r="6" fill="#f85149"/><circle cx="42" cy="17" r="6" fill="#d29922"/><circle cx="62" cy="17" r="6" fill="#3fb950"/>
<text x="${w / 2}" y="21" fill="#8b8780" font-size="12" text-anchor="middle">${esc(title)}</text>
${body.join("\n")}
</svg>
`;
}

