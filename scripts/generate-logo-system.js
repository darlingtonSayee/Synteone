const fs = require("fs");
const path = require("path");

const workspace = process.cwd();
const outRoot = path.join(workspace, "assets", "logo-system");
const depsNodeModules =
  process.env.CODEX_NODE_MODULES ||
  "C:\\Users\\user\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules";
const depsPnpmNodeModules = path.join(depsNodeModules, ".pnpm", "node_modules");
process.env.NODE_PATH = [depsNodeModules, depsPnpmNodeModules, process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
require("module").Module._initPaths();
const sharp = require("sharp");

const dirs = ["svg", "png", "jpg", "pdf", "eps", "ai", "favicon", "preview"].map((d) =>
  path.join(outRoot, d),
);

const colors = {
  navy: "#1E3A5F",
  ink: "#122A46",
  teal: "#2DB7B5",
  gray: "#8A8D91",
  light: "#F5F8FB",
  white: "#FFFFFF",
  black: "#050505",
};

const modes = {
  "full-color": {
    primary: colors.navy,
    accent: colors.teal,
    secondary: colors.gray,
    text: colors.navy,
    one: colors.ink,
    tagline: colors.gray,
    jpgBg: colors.white,
    pdfBg: null,
  },
  black: {
    primary: colors.black,
    accent: colors.black,
    secondary: colors.black,
    text: colors.black,
    one: colors.black,
    tagline: colors.black,
    jpgBg: colors.white,
    pdfBg: null,
  },
  white: {
    primary: colors.white,
    accent: colors.white,
    secondary: colors.white,
    text: colors.white,
    one: colors.white,
    tagline: colors.white,
    jpgBg: colors.navy,
    pdfBg: colors.navy,
  },
  grayscale: {
    primary: "#2F3337",
    accent: "#6E747A",
    secondary: "#A6ABB0",
    text: "#2F3337",
    one: "#1C1F22",
    tagline: "#6E747A",
    jpgBg: colors.white,
    pdfBg: null,
  },
};

const baseVariants = [
  { id: "primary-logo-landscape", type: "primary", width: 1200, height: 420 },
  { id: "secondary-logo-stacked", type: "secondary", width: 900, height: 900 },
  { id: "icon-logo-mark", type: "mark", width: 512, height: 512 },
  { id: "wordmark", type: "wordmark", width: 1000, height: 240 },
  { id: "monogram-s1", type: "monogram", width: 512, height: 512 },
];

const additionalVariants = [
  { id: "favicon-app-icon", type: "appIcon", width: 1024, height: 1024, modes: ["full-color"] },
  { id: "social-profile-square", type: "socialSquare", width: 1200, height: 1200, modes: ["full-color"] },
  { id: "social-cover-landscape", type: "socialCover", width: 1600, height: 900, modes: ["full-color"] },
  { id: "primary-logo-portrait", type: "portrait", width: 1080, height: 1350, modes: ["full-color"] },
  { id: "primary-logo-square", type: "square", width: 1080, height: 1080, modes: ["full-color"] },
];

function ensureDirs() {
  fs.rmSync(outRoot, { recursive: true, force: true });
  dirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c];
  });
}

function rect(width, height, fill) {
  return fill ? `<rect width="${width}" height="${height}" fill="${fill}"/>` : "";
}

function markSvg(t, x, y, size) {
  const s = size / 256;
  const sw = 12;
  return `
    <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="93" cy="86" r="56" stroke="${t.primary}" stroke-width="${sw}"/>
      <circle cx="163" cy="86" r="56" stroke="${t.accent}" stroke-width="${sw}"/>
      <circle cx="128" cy="153" r="56" stroke="${t.secondary}" stroke-width="${sw}"/>
      <circle cx="128" cy="116" r="30" fill="${t.primary}" stroke="none"/>
      <circle cx="128" cy="116" r="12" fill="${t.accent}" stroke="none"/>
    </g>`;
}

function wordSvg(t, x, baseline, size = 82, includeTagline = false, taglineY = 0) {
  const synteWidth = size * 2.65;
  const oneX = x + synteWidth;
  const tagline = includeTagline
    ? `<text x="${x + 4}" y="${taglineY}" fill="${t.tagline}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(
        size * 0.31,
      )}" font-weight="700">One company. Multiple brands. One vision.</text>`
    : "";

  return `
    <g>
      <text x="${x}" y="${baseline}" fill="${t.text}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="400">Synte</text>
      <text x="${oneX}" y="${baseline}" fill="${t.one}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="800">ONE</text>
      ${tagline}
    </g>`;
}

function monogramSvg(t, x, y, size) {
  const font = size * 0.5;
  return `
    <g transform="translate(${x} ${y})">
      <circle cx="${size * 0.39}" cy="${size * 0.19}" r="${size * 0.055}" fill="none" stroke="${t.primary}" stroke-width="${size * 0.025}"/>
      <circle cx="${size * 0.5}" cy="${size * 0.19}" r="${size * 0.055}" fill="none" stroke="${t.accent}" stroke-width="${size * 0.025}"/>
      <circle cx="${size * 0.445}" cy="${size * 0.29}" r="${size * 0.055}" fill="none" stroke="${t.secondary}" stroke-width="${size * 0.025}"/>
      <circle cx="${size * 0.445}" cy="${size * 0.23}" r="${size * 0.032}" fill="${t.primary}"/>
      <text x="${size * 0.5}" y="${size * 0.69}" text-anchor="middle" fill="${t.text}" font-family="Arial, Helvetica, sans-serif" font-size="${font}" font-weight="800">S1</text>
    </g>`;
}

function svgFor(variant, modeName, options = {}) {
  const t = modes[modeName];
  const { width, height, type } = variant;
  const bg = options.background === undefined ? null : options.background;
  let body = "";

  if (type === "primary") {
    body = `${markSvg(t, 80, 82, 250)}${wordSvg(t, 390, 186, 94, true, 252)}`;
  } else if (type === "secondary") {
    body = `${markSvg(t, 283, 104, 334)}${wordSvg(t, 197, 548, 100, true, 626)}`;
  } else if (type === "mark") {
    body = markSvg(t, 42, 42, 428);
  } else if (type === "wordmark") {
    body = wordSvg(t, 72, 156, 118, false);
  } else if (type === "monogram") {
    body = monogramSvg(t, 54, 54, 404);
  } else if (type === "appIcon") {
    body = `${rect(width, height, colors.white)}${markSvg(t, 166, 166, 692)}`;
  } else if (type === "socialSquare") {
    body = `${rect(width, height, colors.white)}${markSvg(t, 315, 170, 570)}${wordSvg(
      t,
      205,
      820,
      112,
      true,
      905,
    )}`;
  } else if (type === "socialCover") {
    body = `${rect(width, height, colors.white)}${markSvg(t, 145, 188, 390)}${wordSvg(
      t,
      635,
      370,
      132,
      true,
      472,
    )}`;
  } else if (type === "portrait") {
    body = `${rect(width, height, colors.white)}${markSvg(t, 285, 205, 510)}${wordSvg(
      t,
      154,
      875,
      122,
      true,
      968,
    )}`;
  } else if (type === "square") {
    body = `${rect(width, height, colors.white)}${markSvg(t, 270, 150, 540)}${wordSvg(
      t,
      146,
      810,
      120,
      false,
    )}`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Synteone ${esc(
    variant.id,
  )} ${esc(modeName)}">
  ${rect(width, height, bg)}
  ${body}
</svg>
`;
}

function addPsColor(lines, hex) {
  const [r, g, b] = hexToRgb(hex);
  lines.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} setrgbcolor`);
}

function psCircle(lines, cx, cy, r, stroke, fill, sw = 12) {
  if (fill) {
    addPsColor(lines, fill);
    lines.push(`newpath ${cx.toFixed(2)} ${cy.toFixed(2)} ${r.toFixed(2)} 0 360 arc closepath fill`);
  }
  if (stroke) {
    addPsColor(lines, stroke);
    lines.push(`${sw.toFixed(2)} setlinewidth`);
    lines.push(`newpath ${cx.toFixed(2)} ${cy.toFixed(2)} ${r.toFixed(2)} 0 360 arc closepath stroke`);
  }
}

function psText(lines, text, x, y, size, weight, fill) {
  addPsColor(lines, fill);
  lines.push(`/${weight >= 700 ? "Helvetica-Bold" : "Helvetica"} findfont ${size} scalefont setfont`);
  lines.push(`${x.toFixed(2)} ${y.toFixed(2)} moveto (${text}) show`);
}

function pdfEscape(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfColor(hex, op) {
  const [r, g, b] = hexToRgb(hex);
  return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} ${op}`;
}

function pdfCircle(lines, cx, cy, r, stroke, fill, sw = 12) {
  const c = r * 0.552284749831;
  lines.push(
    `${(cx + r).toFixed(2)} ${cy.toFixed(2)} m`,
    `${(cx + r).toFixed(2)} ${(cy + c).toFixed(2)} ${(cx + c).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c`,
    `${(cx - c).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + c).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c`,
    `${(cx - r).toFixed(2)} ${(cy - c).toFixed(2)} ${(cx - c).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c`,
    `${(cx + c).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - c).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c`,
    "h",
  );
  if (fill && stroke) {
    lines.push(pdfColor(fill, "rg"), pdfColor(stroke, "RG"), `${sw.toFixed(2)} w`, "B");
  } else if (fill) {
    lines.push(pdfColor(fill, "rg"), "f");
  } else if (stroke) {
    lines.push(pdfColor(stroke, "RG"), `${sw.toFixed(2)} w`, "S");
  }
}

function pdfText(lines, text, x, y, size, weight, fill) {
  const font = weight >= 700 ? "F2" : "F1";
  lines.push(
    pdfColor(fill, "rg"),
    "BT",
    `/${font} ${size} Tf`,
    `${x.toFixed(2)} ${y.toFixed(2)} Td`,
    `(${pdfEscape(text)}) Tj`,
    "ET",
  );
}

function pdfMark(lines, t, x, y, size, pageHeight) {
  const s = size / 256;
  const yConv = (localY) => pageHeight - (y + localY * s);
  const xConv = (localX) => x + localX * s;
  pdfCircle(lines, xConv(93), yConv(86), 56 * s, t.primary, null, 12 * s);
  pdfCircle(lines, xConv(163), yConv(86), 56 * s, t.accent, null, 12 * s);
  pdfCircle(lines, xConv(128), yConv(153), 56 * s, t.secondary, null, 12 * s);
  pdfCircle(lines, xConv(128), yConv(116), 30 * s, null, t.primary);
  pdfCircle(lines, xConv(128), yConv(116), 12 * s, null, t.accent);
}

function makePdf(width, height, contentLines) {
  const content = `${contentLines.join("\n")}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

function pdfFor(variant, modeName) {
  const t = modes[modeName];
  const { width, height, type } = variant;
  const lines = ["1 J 1 j"];
  const hasBuiltInWhiteBg = ["appIcon", "socialSquare", "socialCover", "portrait", "square"].includes(type);
  const bg = t.pdfBg || (hasBuiltInWhiteBg ? colors.white : null);
  if (bg) {
    lines.push(pdfColor(bg, "rg"), `0 0 ${width} ${height} re`, "f");
  }

  function word(x, baselineSvg, size, taglineSvg) {
    const y = height - baselineSvg;
    pdfText(lines, "Synte", x, y, size, 400, t.text);
    pdfText(lines, "ONE", x + size * 2.65, y, size, 800, t.one);
    if (taglineSvg) {
      pdfText(lines, "One company. Multiple brands. One vision.", x + 4, height - taglineSvg, Math.round(size * 0.31), 800, t.tagline);
    }
  }

  if (type === "primary") {
    pdfMark(lines, t, 80, 82, 250, height);
    word(390, 186, 94, 252);
  } else if (type === "secondary") {
    pdfMark(lines, t, 283, 104, 334, height);
    word(197, 548, 100, 626);
  } else if (type === "mark") {
    pdfMark(lines, t, 42, 42, 428, height);
  } else if (type === "wordmark") {
    word(72, 156, 118, null);
  } else if (type === "monogram") {
    pdfCircle(lines, 212, height - 131, 22, t.primary, null, 10);
    pdfCircle(lines, 256, height - 131, 22, t.accent, null, 10);
    pdfCircle(lines, 234, height - 171, 22, t.secondary, null, 10);
    pdfCircle(lines, 234, height - 147, 13, null, t.primary);
    pdfText(lines, "S1", 139, height - 333, 202, 800, t.text);
  } else if (type === "appIcon") {
    pdfMark(lines, t, 166, 166, 692, height);
  } else if (type === "socialSquare") {
    pdfMark(lines, t, 315, 170, 570, height);
    word(205, 820, 112, 905);
  } else if (type === "socialCover") {
    pdfMark(lines, t, 145, 188, 390, height);
    word(635, 370, 132, 472);
  } else if (type === "portrait") {
    pdfMark(lines, t, 285, 205, 510, height);
    word(154, 875, 122, 968);
  } else if (type === "square") {
    pdfMark(lines, t, 270, 150, 540, height);
    word(146, 810, 120, null);
  }

  return makePdf(width, height, lines);
}

function psMark(lines, t, x, y, size, pageHeight) {
  const s = size / 256;
  const yConv = (localY) => pageHeight - (y + localY * s);
  const xConv = (localX) => x + localX * s;
  psCircle(lines, xConv(93), yConv(86), 56 * s, t.primary, null, 12 * s);
  psCircle(lines, xConv(163), yConv(86), 56 * s, t.accent, null, 12 * s);
  psCircle(lines, xConv(128), yConv(153), 56 * s, t.secondary, null, 12 * s);
  psCircle(lines, xConv(128), yConv(116), 30 * s, null, t.primary);
  psCircle(lines, xConv(128), yConv(116), 12 * s, null, t.accent);
}

function epsFor(variant, modeName) {
  const t = modes[modeName];
  const { width, height, type } = variant;
  const lines = [
    "%!PS-Adobe-3.0 EPSF-3.0",
    `%%Title: Synteone ${variant.id} ${modeName}`,
    "%%Creator: Synteone logo system generator",
    `%%BoundingBox: 0 0 ${width} ${height}`,
    "%%LanguageLevel: 2",
    "%%EndComments",
    "1 setlinecap 1 setlinejoin",
  ];

  function word(x, baselineSvg, size, taglineSvg) {
    const y = height - baselineSvg;
    psText(lines, "Synte", x, y, size, 400, t.text);
    psText(lines, "ONE", x + size * 2.65, y, size, 800, t.one);
    if (taglineSvg) {
      psText(lines, "One company. Multiple brands. One vision.", x + 4, height - taglineSvg, Math.round(size * 0.31), 800, t.tagline);
    }
  }

  if (type === "primary") {
    psMark(lines, t, 80, 82, 250, height);
    word(390, 186, 94, 252);
  } else if (type === "secondary") {
    psMark(lines, t, 283, 104, 334, height);
    word(197, 548, 100, 626);
  } else if (type === "mark") {
    psMark(lines, t, 42, 42, 428, height);
  } else if (type === "wordmark") {
    word(72, 156, 118, null);
  } else if (type === "monogram") {
    psCircle(lines, 212, height - 131, 22, t.primary, null, 10);
    psCircle(lines, 256, height - 131, 22, t.accent, null, 10);
    psCircle(lines, 234, height - 171, 22, t.secondary, null, 10);
    psCircle(lines, 234, height - 147, 13, null, t.primary);
    psText(lines, "S1", 139, height - 333, 202, 800, t.text);
  } else {
    psMark(lines, t, width * 0.2, height * 0.16, Math.min(width, height) * 0.65, height);
  }

  lines.push("showpage", "%%EOF", "");
  return lines.join("\n");
}

function writePdf(variant, modeName) {
  fs.writeFileSync(path.join(outRoot, "pdf", `${variant.id}_${modeName}.pdf`), pdfFor(variant, modeName), "ascii");
}

async function writeRaster(variant, modeName) {
  const t = modes[modeName];
  const svg = svgFor(variant, modeName);
  const stem = `${variant.id}_${modeName}`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(outRoot, "png", `${stem}.png`));
  const jpgSvg = svgFor(variant, modeName, { background: t.jpgBg });
  await sharp(Buffer.from(jpgSvg), { density: 300 })
    .resize(variant.width * 2, variant.height * 2)
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
    .toFile(path.join(outRoot, "jpg", `${stem}_high-res.jpg`));
}

function writeSvgEpsAi(variant, modeName) {
  const stem = `${variant.id}_${modeName}`;
  fs.writeFileSync(path.join(outRoot, "svg", `${stem}.svg`), svgFor(variant, modeName));
  const eps = epsFor(variant, modeName);
  fs.writeFileSync(path.join(outRoot, "eps", `${stem}.eps`), eps);
  fs.writeFileSync(path.join(outRoot, "ai", `${stem}.ai`), eps);
}

async function writeFavicons() {
  const variant = { id: "favicon-app-icon", type: "appIcon", width: 1024, height: 1024 };
  const svg = svgFor(variant, "full-color");
  fs.writeFileSync(path.join(outRoot, "favicon", "favicon.svg"), svg);
  for (const size of [16, 32, 48, 180, 192, 512]) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(outRoot, "favicon", `favicon-${size}.png`));
  }
}

function readme() {
  return `# Synteone Logo System

Generated logo asset package for SYNTEONE LTD.

## Concept

The symbol keeps Synteone's existing synthesis idea: three interlocking forms becoming one central core. The refined mark is paired with a practical wordmark where "Synte" stays calm and human, while "ONE" carries the consolidation idea.

## Color Palette

- Synteone Navy: ${colors.navy}
- Core Ink: ${colors.ink}
- Synthesis Teal: ${colors.teal}
- Neutral Gray: ${colors.gray}
- White: ${colors.white}
- Black: ${colors.black}

## Included Lockups

- Primary logo, landscape
- Secondary logo, stacked
- Icon / logo mark
- Wordmark
- S1 monogram
- Favicon / app icon
- Social profile square
- Social cover landscape
- Portrait and square primary orientations

## Included Versions

- Full-color
- Black
- White reverse
- Grayscale

## Formats

- SVG: editable vector source
- EPS: editable PostScript vector
- AI: Adobe Illustrator-compatible EPS-based source files
- PDF: presentation/vector handoff files
- PNG: transparent background
- JPG: high-resolution exports with an appropriate visible background

JPG files cannot preserve transparency, so the white reverse JPGs use a navy background.
`;
}

function brandSheetSvg() {
  const w = 1600;
  const h = 1200;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#F5F8FB"/>
  <text x="80" y="110" fill="${colors.navy}" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="800">Synteone Logo System</text>
  <text x="80" y="158" fill="${colors.gray}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700">Primary, secondary, mark, wordmark, monogram, color modes, and social/app formats</text>
  <rect x="80" y="220" width="1440" height="280" fill="#FFFFFF"/>
  ${svgFor({ id: "primary-logo-landscape", type: "primary", width: 1200, height: 420 }, "full-color")
    .replace(/<\?xml[^>]+>\s*/, "")
    .replace(/<svg[^>]+>/, '<g transform="translate(170 150) scale(.78)">')
    .replace("</svg>", "</g>")}
  <rect x="80" y="560" width="320" height="320" fill="#FFFFFF"/>
  ${markSvg(modes["full-color"], 118, 598, 244)}
  <rect x="440" y="560" width="500" height="320" fill="#FFFFFF"/>
  ${wordSvg(modes["full-color"], 495, 744, 82, false)}
  <rect x="980" y="560" width="260" height="320" fill="${colors.navy}"/>
  ${markSvg(modes.white, 1010, 588, 200)}
  <rect x="1280" y="560" width="240" height="320" fill="#FFFFFF"/>
  ${monogramSvg(modes["full-color"], 1306, 604, 188)}
  <text x="80" y="975" fill="${colors.navy}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800">Palette</text>
  ${["navy", "ink", "teal", "gray", "black"].map((name, i) => {
    const x = 80 + i * 230;
    return `<rect x="${x}" y="1015" width="170" height="72" fill="${colors[name]}"/><text x="${x}" y="1128" fill="${colors.navy}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">${name}: ${colors[name]}</text>`;
  }).join("")}
</svg>`;
}

async function main() {
  ensureDirs();
  fs.writeFileSync(path.join(outRoot, "README.md"), readme());

  const variants = [
    ...baseVariants.flatMap((variant) =>
      Object.keys(modes).map((modeName) => ({ ...variant, modeName })),
    ),
    ...additionalVariants.flatMap((variant) =>
      variant.modes.map((modeName) => ({ ...variant, modeName })),
    ),
  ];

  for (const item of variants) {
    const { modeName, ...variant } = item;
    writeSvgEpsAi(variant, modeName);
    await writeRaster(variant, modeName);
    writePdf(variant, modeName);
  }

  await writeFavicons();

  const sheet = brandSheetSvg();
  fs.writeFileSync(path.join(outRoot, "preview", "synteone-logo-system-brand-sheet.svg"), sheet);
  await sharp(Buffer.from(sheet)).png().toFile(path.join(outRoot, "preview", "synteone-logo-system-brand-sheet.png"));

  console.log(`Generated ${variants.length} logo variants in ${outRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
