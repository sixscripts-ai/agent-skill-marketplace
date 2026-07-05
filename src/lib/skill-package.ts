import JSZip from "jszip";
import { put } from "@vercel/blob";
import { assertBlobStorageConfigured } from "./deployment-config.js";
import { parseSkillMarkdown } from "./skill-import";
import type { MarketplaceUser, ParsedSkillImport, SkillPackage, SkillPackageFile, SkillPackageFileRole } from "./types";

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".skill",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".js",
  ".ts",
  ".mjs",
  ".py",
  ".sh",
  ".css",
  ".html",
]);
const MAX_TEXT_BYTES = 1024 * 1024;
const MAX_PACKAGE_BYTES = 25 * 1024 * 1024;
const MAX_FOLDER_FILES = 200;

type RawPackageFile = {
  path: string;
  bytes: Uint8Array;
  mimeType: string;
};

export type ProcessedSkillUpload = ParsedSkillImport & {
  uploadSource: SkillPackage["uploadSource"];
  originalFilename: string;
  blobPrefix: string;
  manifest: Record<string, unknown>;
  files: SkillPackageFile[];
};

export async function processSkillUpload(files: File[], owner: MarketplaceUser): Promise<ProcessedSkillUpload> {
  assertBlobStorageConfigured();

  if (!files.length) throw new Error("Upload at least one .md, .skill, .zip, or folder file.");
  const originalFilename = files.length === 1 ? files[0].name : "uploaded-folder";
  const totalUploadBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalUploadBytes > MAX_PACKAGE_BYTES) throw new Error("Skill package must be 25 MB or smaller.");
  if (files.length > MAX_FOLDER_FILES) throw new Error(`Folder uploads are limited to ${MAX_FOLDER_FILES} files.`);

  const single = files.length === 1 ? files[0] : undefined;
  const singleName = single?.name.toLowerCase() ?? "";
  const uploadSource: SkillPackage["uploadSource"] = singleName.endsWith(".zip")
    ? "zip"
    : files.length > 1
      ? "folder"
      : singleName.endsWith(".skill")
        ? "skill"
        : "md";
  let rawFiles: RawPackageFile[];

  if (uploadSource === "zip" && single) {
    rawFiles = await unzipSkillPackage(single);
  } else {
    rawFiles = await Promise.all(
      files.map(async (file) => ({
        path: sanitizePackagePath(file.name),
        bytes: new Uint8Array(await file.arrayBuffer()),
        mimeType: file.type || mimeTypeForPath(file.name),
      })),
    );
  }

  if (!rawFiles.length) throw new Error("No supported files were found in the uploaded package.");
  if (rawFiles.length > MAX_FOLDER_FILES) throw new Error(`Packages are limited to ${MAX_FOLDER_FILES} files.`);
  const packageBytes = rawFiles.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  if (packageBytes > MAX_PACKAGE_BYTES) throw new Error("Skill package must be 25 MB or smaller.");

  const primary = findPrimarySkillFile(rawFiles);
  if (!primary) throw new Error("Upload must include SKILL.md, a .skill file, or a markdown skill file.");
  if (primary.bytes.byteLength > MAX_TEXT_BYTES) throw new Error("Primary skill file must be 1 MB or smaller.");

  const skillMd = decodeText(primary.bytes, primary.path);
  const parsed = parseSkillMarkdown(skillMd);
  const blobPrefix = `skills/${owner.id}/${parsed.slug || `upload-${Date.now()}`}`;
  const storedFiles = await Promise.all(rawFiles.map((file) => storePackageFile(file, blobPrefix)));
  const packageFiles = storedFiles.map((file) => file.packageFile);
  const manifest = {
    primarySkillPath: primary.path,
    uploadSource,
    originalFilename,
    fileCount: packageFiles.length,
    totalBytes: packageBytes,
    files: packageFiles.map(({ path, size, role }) => ({ path, size, role })),
  };

  return {
    ...parsed,
    primarySkillMd: skillMd,
    packageFiles,
    packageUploadId: undefined,
    uploadSource,
    originalFilename,
    blobPrefix,
    manifest,
    files: packageFiles,
  };
}

async function unzipSkillPackage(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const rawFiles: RawPackageFile[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const safePath = sanitizePackagePath(entry.name);
    const bytes = new Uint8Array(await entry.async("uint8array"));
    rawFiles.push({ path: safePath, bytes, mimeType: mimeTypeForPath(safePath) });
  }
  return rawFiles;
}

async function storePackageFile(file: RawPackageFile, blobPrefix: string) {
  const role = roleForPath(file.path);
  const isText = isTextPath(file.path, file.mimeType);
  let content = isText && file.bytes.byteLength <= MAX_TEXT_BYTES ? decodeText(file.bytes, file.path) : undefined;
  let blobUrl: string | undefined;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${blobPrefix}/${file.path}`, Buffer.from(file.bytes), {
      access: "public",
      contentType: file.mimeType,
      addRandomSuffix: false,
    });
    blobUrl = blob.url;
  } else if (!content) {
    content = `data:${file.mimeType};base64,${Buffer.from(file.bytes).toString("base64")}`;
  }

  return {
    packageFile: {
      path: file.path,
      blobUrl,
      content,
      mimeType: file.mimeType,
      size: file.bytes.byteLength,
      role,
    } satisfies SkillPackageFile,
  };
}

function sanitizePackagePath(input: string) {
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

function findPrimarySkillFile(files: RawPackageFile[]) {
  return (
    files.find((file) => basename(file.path).toLowerCase() === "skill.md") ??
    files.find((file) => file.path.toLowerCase().endsWith(".skill")) ??
    files.find((file) => file.path.toLowerCase().endsWith(".md"))
  );
}

function basename(filePath: string) {
  return filePath.split("/").pop() ?? filePath;
}

function extname(filePath: string) {
  const name = basename(filePath).toLowerCase();
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index) : "";
}

function isTextPath(filePath: string, mimeType: string) {
  return mimeType.startsWith("text/") || TEXT_EXTENSIONS.has(extname(filePath));
}

function decodeText(bytes: Uint8Array, filePath: string) {
  if (!isTextPath(filePath, mimeTypeForPath(filePath))) throw new Error(`Unsupported binary primary skill file: ${filePath}`);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function roleForPath(filePath: string): SkillPackageFileRole {
  const lower = filePath.toLowerCase();
  const name = basename(lower);
  if (name === "skill.md" || lower.endsWith(".skill")) return "skill_md";
  if (name === "readme.md") return "readme";
  if (lower.startsWith("scripts/") || [".js", ".ts", ".mjs", ".py", ".sh"].includes(extname(lower))) return "script";
  if (lower.startsWith("references/")) return "reference";
  if (lower.startsWith("assets/") || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return "asset";
  if (lower.startsWith("docs/") || lower.endsWith(".md")) return "doc";
  if (lower.startsWith("examples/")) return "example";
  if ([".json", ".yaml", ".yml", ".toml"].includes(extname(lower))) return "config";
  return "other";
}

function mimeTypeForPath(filePath: string) {
  const ext = extname(filePath);
  if (ext === ".md" || ext === ".markdown" || ext === ".skill") return "text/markdown";
  if (ext === ".json") return "application/json";
  if (ext === ".yaml" || ext === ".yml") return "application/yaml";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (TEXT_EXTENSIONS.has(ext)) return "text/plain";
  return "application/octet-stream";
}
