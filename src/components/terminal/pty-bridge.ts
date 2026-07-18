export type PtyBridgeHandlers = {
  onData: (data: string | Uint8Array) => void;
  onOpen?: () => void;
  onClose?: (reason?: string) => void;
  onError?: (message: string) => void;
  onStatus?: (message: string) => void;
};

/**
 * Browser adapter for Vercel Sandbox openInteractive() WebSocket credentials.
 * Speaks ready/resize control frames; treats non-JSON payloads as PTY bytes.
 */
export class PtyBridge {
  private ws: WebSocket | null = null;
  private closedByUser = false;
  private cols: number;
  private rows: number;

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly handlers: PtyBridgeHandlers,
    size?: { cols?: number; rows?: number },
  ) {
    this.cols = size?.cols ?? 100;
    this.rows = size?.rows ?? 32;
  }

  connect() {
    this.closedByUser = false;
    const endpoint = withToken(this.url, this.token);
    this.handlers.onStatus?.(`Connecting PTY…`);
    const ws = new WebSocket(endpoint);
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.onopen = () => {
      this.sendJson({ type: "auth", token: this.token });
      this.sendJson({ type: "ready" });
      this.sendJson({ type: "resize", cols: this.cols, rows: this.rows });
      this.handlers.onOpen?.();
      this.handlers.onStatus?.("PTY connected");
    };

    ws.onmessage = (event) => {
      const payload = event.data;
      if (typeof payload === "string") {
        if (tryParseControl(payload)) return;
        this.handlers.onData(payload);
        return;
      }
      if (payload instanceof ArrayBuffer) {
        const bytes = new Uint8Array(payload);
        const asText = decodeUtf8(bytes);
        if (tryParseControl(asText)) return;
        this.handlers.onData(bytes);
        return;
      }
      if (payload instanceof Blob) {
        void payload.arrayBuffer().then((buffer) => {
          const bytes = new Uint8Array(buffer);
          const asText = decodeUtf8(bytes);
          if (tryParseControl(asText)) return;
          this.handlers.onData(bytes);
        });
      }
    };

    ws.onerror = () => {
      this.handlers.onError?.("PTY WebSocket error");
    };

    ws.onclose = (event) => {
      this.ws = null;
      if (!this.closedByUser) {
        this.handlers.onClose?.(event.reason || `closed (${event.code})`);
      }
    };
  }

  send(data: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    // Raw PTY stdin. Control frames are only used for auth/ready/resize.
    this.ws.send(data);
  }

  resize(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.sendJson({ type: "resize", cols, rows });
  }

  close() {
    this.closedByUser = true;
    this.ws?.close();
    this.ws = null;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private sendJson(value: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(value));
    } catch {
      // ignore send failures during teardown
    }
  }
}

function withToken(url: string, token: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("token")) {
      parsed.searchParams.set("token", token);
    }
    return parsed.toString();
  } catch {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}token=${encodeURIComponent(token)}`;
  }
}

function tryParseControl(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  try {
    const value = JSON.parse(trimmed) as { type?: string };
    return typeof value.type === "string" && ["ready", "resize", "ping", "pong", "auth", "ack"].includes(value.type);
  } catch {
    return false;
  }
}

function decodeUtf8(bytes: Uint8Array) {
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}
