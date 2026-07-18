/** Redact likely API-key / secret patterns from text before Neon persistence. */
export function redactSecrets(value: string): string {
  if (!value) return value;
  return value
    .replace(/\b(sk-[A-Za-z0-9_-]{10,})\b/g, "[REDACTED_KEY]")
    .replace(/\b(sk-ant-[A-Za-z0-9_-]{10,})\b/g, "[REDACTED_KEY]")
    .replace(/\b(xai-[A-Za-z0-9_-]{10,})\b/g, "[REDACTED_KEY]")
    .replace(/\b(gsk_[A-Za-z0-9_-]{10,})\b/g, "[REDACTED_KEY]")
    .replace(/\b(AIza[A-Za-z0-9_-]{10,})\b/g, "[REDACTED_KEY]")
    .replace(/\b(Bearer\s+[A-Za-z0-9._\-]+)\b/gi, "Bearer [REDACTED]")
    .replace(/(api[_-]?key\s*[:=]\s*)(["']?)[^"'\\s]+/gi, "$1$2[REDACTED]");
}

export function redactErrorMessage(value: string): string {
  return redactSecrets(value).slice(0, 4000);
}
