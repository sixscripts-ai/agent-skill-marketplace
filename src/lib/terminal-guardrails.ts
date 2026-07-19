const DESTRUCTIVE_PATTERN =
  /\b(rm\s+-rf\s+[\/~]|mkfs|dd\s+if=|shutdown|reboot|passwd|:(){:|:&};:|curl\s+[^\n]*\|\s*(ba)?sh)\b/i;

const MAX_COMMAND_CHARS = 4_000;
const MAX_OUTPUT_BYTES = 200_000;
const MAX_FILE_BYTES = 200_000;
const DEFAULT_MAX_STEPS = 12;
const COMMAND_TIMEOUT_MS = 60_000;
const SESSION_TIMEOUT_MS = 15 * 60_000;

export const terminalLimits = {
  maxCommandChars: MAX_COMMAND_CHARS,
  maxOutputBytes: MAX_OUTPUT_BYTES,
  maxFileBytes: MAX_FILE_BYTES,
  defaultMaxSteps: DEFAULT_MAX_STEPS,
  commandTimeoutMs: COMMAND_TIMEOUT_MS,
  sessionTimeoutMs: SESSION_TIMEOUT_MS,
} as const;

export function isDestructiveCommand(command: string) {
  return DESTRUCTIVE_PATTERN.test(command);
}

export function assertSafeCommand(command: string, opts?: { allowDestructive?: boolean }) {
  const trimmed = command.trim();
  if (!trimmed) {
    return { ok: false as const, code: "MISSING_COMMAND", message: "Command is required." };
  }
  if (trimmed.length > MAX_COMMAND_CHARS) {
    return { ok: false as const, code: "COMMAND_TOO_LONG", message: `Command exceeds ${MAX_COMMAND_CHARS} characters.` };
  }
  if (/\0/.test(trimmed)) {
    return { ok: false as const, code: "INVALID_COMMAND", message: "Command contains null bytes." };
  }
  if (isDestructiveCommand(trimmed) && !opts?.allowDestructive) {
    return {
      ok: false as const,
      code: "DESTRUCTIVE_CONFIRM_REQUIRED",
      message: "Destructive command requires explicit confirmation.",
      suggestion: "Retry with confirmDestructive: true after user approval.",
    };
  }
  return { ok: true as const, command: trimmed };
}

export function truncateOutput(text: string, maxBytes = MAX_OUTPUT_BYTES) {
  if (Buffer.byteLength(text) <= maxBytes) return text;
  return `${text.slice(0, maxBytes)}\n\n[output truncated at ${Math.floor(maxBytes / 1000)} KB]`;
}
