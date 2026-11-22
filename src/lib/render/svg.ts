// Deterministic, on-brand SVG generation for creatives. Pure (no deps) — the
// output is rasterised to PNG by sharp and/or framed into MP4 by ffmpeg.

export interface RenderSpec {
  kind: "static_graphic" | "carousel" | "video";
  headline: string;
  subhead?: string;
  cta?: string;
  colors: { bg: string; fg: string; accent: string };
  logoText: string;
  width: number;
  height: number;
  slides?: { title: string; body: string }[];
  scenes?: { caption: string; seconds: number }[];
}

function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Naive word-wrap into <= maxChars lines.
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, "…");
  }
  return lines;
}

function tspans(lines: string[], x: number, y: number, lh: number): string {
  return lines.map((l, i) => `<tspan x="${x}" y="${y + i * lh}">${esc(l)}</tspan>`).join("");
}

/** A single branded static graphic (also used as a carousel/video frame). */
export function staticSvg(spec: RenderSpec, opts?: { badge?: string; slideTitle?: string; slideBody?: string; frameCaption?: string }): string {
  const { width: W, height: H, colors } = spec;
  const pad = Math.round(W * 0.08);
  const headline = opts?.slideTitle ?? spec.headline;
  const body = opts?.slideBody ?? spec.subhead ?? "";
  const caption = opts?.frameCaption;
  const headLines = wrap(headline, Math.round(W / 34), 4);
  const bodyLines = wrap(body, Math.round(W / 24), 3);
  const headSize = Math.round(W * 0.072);
  const bodySize = Math.round(W * 0.034);
  const headY = Math.round(H * 0.34);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colors.bg}"/>
      <stop offset="1" stop-color="${shade(colors.bg, -18)}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${Math.round(W * 0.02)}" height="${H}" fill="${colors.accent}"/>
  <rect x="${pad}" y="${Math.round(H * 0.12)}" width="${Math.round(W * 0.12)}" height="${Math.round(H * 0.011)}" rx="3" fill="${colors.accent}"/>
  ${opts?.badge ? `<text x="${pad}" y="${Math.round(H * 0.1)}" font-family="Arial, sans-serif" font-size="${Math.round(W * 0.03)}" font-weight="700" fill="${colors.accent}" letter-spacing="2">${esc(opts.badge.toUpperCase())}</text>` : ""}
  <text font-family="Arial, Helvetica, sans-serif" font-size="${headSize}" font-weight="800" fill="${colors.fg}">
    ${tspans(headLines, pad, headY, Math.round(headSize * 1.1))}
  </text>
  ${bodyLines.length ? `<text font-family="Arial, sans-serif" font-size="${bodySize}" fill="${hexA(colors.fg, 0.85)}">
    ${tspans(bodyLines, pad, headY + headLines.length * Math.round(headSize * 1.1) + Math.round(H * 0.04), Math.round(bodySize * 1.4))}
  </text>` : ""}
  ${caption ? `<rect x="0" y="${Math.round(H * 0.82)}" width="${W}" height="${Math.round(H * 0.1)}" fill="${hexA("#000000", 0.35)}"/>
  <text x="${W / 2}" y="${Math.round(H * 0.885)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(W * 0.045)}" font-weight="700" fill="#ffffff">${esc(caption)}</text>` : ""}
  <text x="${pad}" y="${H - pad / 2}" font-family="Arial, sans-serif" font-size="${Math.round(W * 0.03)}" font-weight="700" fill="${colors.fg}">${esc(spec.logoText)}</text>
  ${spec.cta ? `<text x="${W - pad}" y="${H - pad / 2}" text-anchor="end" font-family="Arial, sans-serif" font-size="${Math.round(W * 0.026)}" fill="${colors.accent}">${esc(spec.cta)}</text>` : ""}
</svg>`;
}

/** Lighten/darken a #rrggbb hex by percent (-100..100). */
function shade(hex: string, percent: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `#${full}${a}`;
}
