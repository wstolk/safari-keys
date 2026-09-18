import { mkdir, writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const INK = [92, 92, 97];
const ACCENT = [132, 150, 224];
const STONE = [236, 234, 230];
const STONE_BOT = [222, 220, 216];
const MASTER = 256;
const TOOLBAR = 76;

function chunk(tag, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const payload = Buffer.concat([Buffer.from(tag), data]);
  const crc = Buffer.alloc(4);
  crc.writeInt32BE(zlib.crc32(payload) | 0);
  return Buffer.concat([len, payload, crc]);
}

function createPng(size, paint) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0];
    for (const x of Array.from({ length: size }, (_, i) => i)) {
      row.push(...paint(x, y, size));
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function sdRoundBox(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - hw + r;
  const dy = Math.abs(py - cy) - hh + r;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - r;
}

function sdRing(px, py, cx, cy, hw, hh, r, stroke) {
  const outer = sdRoundBox(px, py, cx, cy, hw, hh, r);
  const innerR = Math.max(r * 0.7, r - stroke * 0.3);
  const inner = sdRoundBox(px, py, cx, cy, hw - stroke, hh - stroke, innerR);
  return Math.max(outer, -inner);
}

function cover(distance, size) {
  return Math.min(1, Math.max(0, 0.5 - distance * size));
}

function mix(a, b, t) {
  const u = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

function over(dst, src, alpha) {
  const a = Math.min(1, Math.max(0, alpha));
  if (a <= 0) {
    return dst;
  }
  const dstA = dst[3] / 255;
  const outA = dstA + a * (1 - dstA);
  if (outA <= 0) {
    return [0, 0, 0, 0];
  }
  return [
    Math.round((dst[0] * dstA * (1 - a) + src[0] * a) / outA),
    Math.round((dst[1] * dstA * (1 - a) + src[1] * a) / outA),
    Math.round((dst[2] * dstA * (1 - a) + src[2] * a) / outA),
    Math.round(outA * 255),
  ];
}

function paintGlyph(x, y, size) {
  const px = (x + 0.5) / size;
  const py = (y + 0.5) / size;
  const ring = sdRing(px, py, 0.5, 0.5, 0.4, 0.31, 0.14, 0.1);
  const chip = sdRoundBox(px, py, 0.35, 0.5, 0.06, 0.1, 0.05);
  let rgba = [0, 0, 0, 0];
  rgba = over(rgba, INK, cover(ring, size));
  rgba = over(rgba, ACCENT, cover(chip, size));
  return rgba;
}

function paintApp(x, y, size) {
  const px = (x + 0.5) / size;
  const py = (y + 0.5) / size;
  let rgba = [...mix(STONE, STONE_BOT, py), 255];
  const shadow = sdRoundBox(px, py, 0.5, 0.53, 0.4, 0.31, 0.14);
  const ring = sdRing(px, py, 0.5, 0.5, 0.38, 0.29, 0.13, 0.055);
  const chip = sdRoundBox(px, py, 0.36, 0.5, 0.055, 0.09, 0.045);
  rgba = over(rgba, [40, 38, 36], cover(shadow, size) * 0.16);
  rgba = over(rgba, INK, cover(ring, size));
  rgba = over(rgba, ACCENT, cover(chip, size));
  return rgba;
}

function sipsResize(src, dest, size) {
  const result = spawnSync("sips", ["-z", String(size), String(size), src, "--out", dest], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `sips failed for ${dest}`);
  }
}

const images = path.join(root, "SafariKeys Extension", "Resources", "images");
const appIconDir = path.join(root, "SafariKeys", "Assets.xcassets", "AppIcon.appiconset");
await mkdir(images, { recursive: true });
await mkdir(appIconDir, { recursive: true });

const masterPath = path.join(os.tmpdir(), "safari-keys-glyph.png");
await writeFile(masterPath, createPng(MASTER, paintGlyph));

for (const name of [16, 19, 32, 38]) {
  sipsResize(masterPath, path.join(images, `icon-${name}.png`), TOOLBAR);
}

for (const size of [48, 96, 128]) {
  await writeFile(path.join(images, `icon-${size}.png`), createPng(size, paintApp));
}

await unlink(masterPath);

const macIcons = [
  ["mac-icon-16@1x.png", 16],
  ["mac-icon-16@2x.png", 32],
  ["mac-icon-32@1x.png", 32],
  ["mac-icon-32@2x.png", 64],
  ["mac-icon-128@1x.png", 128],
  ["mac-icon-128@2x.png", 256],
  ["mac-icon-256@1x.png", 256],
  ["mac-icon-256@2x.png", 512],
  ["mac-icon-512@1x.png", 512],
  ["mac-icon-512@2x.png", 1024],
];

for (const [name, size] of macIcons) {
  await writeFile(path.join(appIconDir, name), createPng(size, paintApp));
}

console.log("Wrote Safari Keys icons");
