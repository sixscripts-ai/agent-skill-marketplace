export type PtyBridgeHandlers = {
  onData: (data: string | Uint8Array) => void;
  onOpen?: () => void;
  onExit?: (code?: number) => void;
  onClose?: (reason?: string) => void;
  onError?: (message: string) => void;
  onStatus?: (message: string) => void;
};

type PtyBridgeOptions = { cols?: number; rows?: number; command?: string; args?: string[]; cwd?: string; env?: Record<string, string> };

/** Browser adapter for the documented Vercel Sandbox openInteractive protocol. */
export class PtyBridge {
  private ws: WebSocket | null = null;
  private closedByUser = false;
  private cols: number;
  private rows: number;
  private command: string;
  private args: string[];
  private cwd: string;
  private env: Record<string, string>;

  constructor(private readonly url: string, private readonly token: string, private readonly handlers: PtyBridgeHandlers, options: PtyBridgeOptions = {}) {
    this.cols = options.cols ?? 100;
    this.rows = options.rows ?? 32;
    this.command = options.command ?? "bash";
    this.args = options.args ?? ["-l"];
    this.cwd = options.cwd ?? "/vercel/sandbox";
    this.env = { TERM: "xterm-256color", ...options.env };
  }

  connect() {
    this.closedByUser = false;
    this.handlers.onStatus?.("Connecting PTY…");
    const ws = new WebSocket(withToken(this.url, this.token));
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    ws.onopen = () => {
      this.sendJson({ type: "start", command: this.command, args: this.args, env: Object.entries(this.env).map(([key, value]) => `${key}=${value}`), cwd: this.cwd, cols: this.cols, rows: this.rows });
      this.handlers.onOpen?.();
      this.handlers.onStatus?.("PTY connected");
    };
    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        if (this.handleControl(event.data)) return;
        this.handlers.onData(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        this.handlers.onData(new Uint8Array(event.data));
      } else if (event.data instanceof Blob) {
        void event.data.arrayBuffer().then((buffer) => this.handlers.onData(new Uint8Array(buffer)));
      }
    };
    ws.onerror = () => this.handlers.onError?.("PTY WebSocket error");
    ws.onclose = (event) => {
      this.ws = null;
      if (!this.closedByUser) this.handlers.onClose?.(event.reason || `closed (${event.code})`);
    };
  }

  send(data: string | Uint8Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(typeof data === "string" ? new TextEncoder().encode(data) : data);
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

  get connected() { return this.ws?.readyState === WebSocket.OPEN; }

  private handleControl(payload: string) {
    try {
      const message = JSON.parse(payload) as { type?: string; code?: number };
      if (message.type === "exit") {
        this.handlers.onExit?.(typeof message.code === "number" ? message.code : undefined);
        return true;
      }
      return typeof message.type === "string";
    } catch { return false; }
  }

  private sendJson(value: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(value));
  }
}

function withToken(url: string, token: string) {
  const parsed = new URL(url);
  parsed.searchParams.set("token", token);
  return parsed.toString();
}
