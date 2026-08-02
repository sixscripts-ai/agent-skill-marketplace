import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

class File {
  constructor(buffer, name, options) {
    this.buffer = buffer;
    this.name = name;
    this.type = options?.type || '';
    this.size = buffer.length;
  }
  async arrayBuffer() {
    return this.buffer.buffer.slice(this.buffer.byteOffset, this.buffer.byteOffset + this.buffer.byteLength);
  }
}
globalThis.File = File;

function sanitizePackagePath(input) {
  const normalized = input.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) throw new Error("Uploaded package contains an invalid file path.");
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.some((segment) => segment === ".." || segment.startsWith(".")) ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.startsWith("__MACOSX/")
  ) {
    throw new Error(`Unsafe package path rejected: ${input}`);
  }
  return segments.join("/");
}
function mimeTypeForPath(filePath) { return "application/octet-stream"; }

// Original implementation
async function unzipSkillPackageSeq(file) {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const rawFiles = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const safePath = sanitizePackagePath(entry.name);
    const bytes = new Uint8Array(await entry.async("uint8array"));
    rawFiles.push({ path: safePath, bytes, mimeType: mimeTypeForPath(safePath) });
  }
  return rawFiles;
}

// Optimized implementation
async function unzipSkillPackagePar(file) {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  const rawFiles = await Promise.all(entries.map(async (entry) => {
    const safePath = sanitizePackagePath(entry.name);
    const bytes = new Uint8Array(await entry.async("uint8array"));
    return { path: safePath, bytes, mimeType: mimeTypeForPath(safePath) };
  }));

  return rawFiles;
}

async function runBench() {
  // Create a dummy zip file
  const zip = new JSZip();
  for (let i = 0; i < 50; i++) {
    zip.file(`file_${i}.txt`, "Hello world ".repeat(1000));
  }
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  // Pass a proper Uint8Array or Buffer
  const file = new File(zipBuffer, "test.zip", { type: "application/zip" });

  console.log("Warming up...");
  for(let i=0; i<10; i++) await unzipSkillPackageSeq(file);

  console.log("Testing sequential...");
  const startSeq = performance.now();
  for(let i=0; i<50; i++) await unzipSkillPackageSeq(file);
  const endSeq = performance.now();

  console.log("Warming up parallel...");
  for(let i=0; i<10; i++) await unzipSkillPackagePar(file);

  console.log("Testing parallel...");
  const startPar = performance.now();
  for(let i=0; i<50; i++) await unzipSkillPackagePar(file);
  const endPar = performance.now();

  console.log(`Sequential: ${endSeq - startSeq}ms`);
  console.log(`Parallel: ${endPar - startPar}ms`);
  console.log(`Speedup: ${((endSeq - startSeq) / (endPar - startPar)).toFixed(2)}x`);
}

runBench().catch(console.error);
