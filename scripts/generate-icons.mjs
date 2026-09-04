import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

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
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size);
      row.push(r, g, b, a);
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

function paintIcon(x, y, size) {
  const n = (v) => (v / size) * 128;
  const px = n(x);
  const py = n(y);
  const inside = px > 18 && px < 110 && py > 22 && py < 106;
  const key = px > 30 && px < 98 && py > 38 && py < 90;
  if (!inside) {
    return [0, 0, 0, 0];
  }
  if (!key) {
    return [29, 29, 31, 255];
  }
  const legend = px > 42 && px < 58 && py > 50 && py < 78;
  if (legend) {
    return [0, 113, 227, 255];
  }
  return [244, 244, 242, 255];
}

const images = path.join(root, "SafariKeys Extension", "Resources", "images");
await mkdir(images, { recursive: true });

for (const size of [16, 32, 48, 96, 128]) {
  await writeFile(path.join(images, `icon-${size}.png`), createPng(size, paintIcon));
}

const appIconDir = path.join(root, "SafariKeys", "Assets.xcassets", "AppIcon.appiconset");
await mkdir(appIconDir, { recursive: true });
await writeFile(path.join(appIconDir, "icon_512x512@2x.png"), createPng(1024, paintIcon));

console.log("Wrote Safari Keys icons");
