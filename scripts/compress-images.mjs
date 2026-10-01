// Shrinks the photos in /public so pages (and next/image, which has to read the original before it can resize it)
// stop pulling multi-megabyte camera files. Same file names and formats, so nothing that references them changes.
//
//   node scripts/compress-images.mjs          rewrite oversized images in place
//   node scripts/compress-images.mjs --dry    only report what would change
//
// Safe to re-run: a file is only rewritten when the result is actually smaller.
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import sharp from "sharp";

const ROOT = new URL("../public/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const MAX_SIDE = 2000;       // plenty for a full-width hero on a large screen
const SKIP_UNDER = 250 * 1024; // already small enough
const dry = process.argv.includes("--dry");

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
let before = 0, after = 0, changed = 0;

for await (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;
  const size = (await stat(file)).size;
  before += size;
  if (size < SKIP_UNDER) { after += size; continue; }

  // rotate() applies the camera's EXIF orientation before the metadata is dropped, so photos stay upright;
  // embedded colour profiles are converted to sRGB on output.
  let img = sharp(await readFile(file)).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
  if (ext === ".png") img = img.png({ compressionLevel: 9, effort: 10 });
  else if (ext === ".webp") img = img.webp({ quality: 80 });
  else img = img.jpeg({ quality: 80, mozjpeg: true });

  const out = await img.toBuffer();
  if (out.length >= size) { after += size; continue; }
  console.log(`${relative(ROOT, file)}: ${kb(size)} -> ${kb(out.length)}`);
  if (!dry) await writeFile(file, out);
  after += out.length;
  changed++;
}
console.log(`\n${changed} files ${dry ? "would be " : ""}rewritten. Images total: ${kb(before)} -> ${kb(after)}`);
