const SHELL_PATH_METACHARS = /[`$;&|<>()[\]{}!*?\n\r\t]/;
const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function sanitizeSandboxPath(input: string) {
  const normalized = input.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (
    !segments.length ||
    segments.some((segment) => segment === "." || segment === ".." || segment.includes("\0") || SHELL_PATH_METACHARS.test(segment)) ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Unsafe sandbox path rejected: ${input}`);
  }
  return segments.join("/");
}

export function isSafeCommandPath(input: string) {
  try {
    sanitizeSandboxPath(input);
    return true;
  } catch {
    return false;
  }
}

export function quoteShellArg(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function normalizeNetworkAllowlist(allowlist: string[]) {
  return allowlist.map(normalizeHost).filter(Boolean).slice(0, 20);
}

function normalizeHost(raw: string) {
  const value = raw.trim().toLowerCase().replace(/\.$/, "");
  if (!value) return "";
  if (value.includes("://") || value.includes("/") || value.includes("*") || value.includes(":") || value.length > 253) {
    throw new Error(`Unsafe network allowlist host rejected: ${raw}`);
  }
  if (isBlockedHost(value)) throw new Error(`Unsafe network allowlist host rejected: ${raw}`);
  const labels = value.split(".");
  if (labels.length < 2 || labels.some((label) => !HOSTNAME_LABEL.test(label))) {
    throw new Error(`Unsafe network allowlist host rejected: ${raw}`);
  }
  return value;
}

function isBlockedHost(host: string) {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "metadata.google.internal") return true;
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    const octets = parts.map(Number);
    if (octets.some((octet) => octet < 0 || octet > 255)) return true;
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 ||
      a === 192 && b === 168
    );
  }
  return false;
}
