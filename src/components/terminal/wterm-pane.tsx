"use client";

import { useEffect, useRef } from "react";
import { Terminal, useTerminal } from "@wterm/react";
import "@wterm/react/css";

type TermApi = {
  write: (data: string | Uint8Array) => void;
  focus: () => void;
  resize: (cols: number, rows: number) => void;
};

type WtermPaneProps = {
  className?: string;
  cols?: number;
  rows?: number;
  /** When true, onData is attached and keystrokes are forwarded (disables built-in echo). */
  forwardInput?: boolean;
  onReadyWrite?: (api: TermApi) => void;
  onUserData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  /** Called when user presses Enter with a buffered line (line-mode shell). */
  onSubmitLine?: (line: string) => void;
};

/**
 * Working wterm setup per https://wterm.dev/react:
 * - No onData → built-in local echo (typing always works)
 * - forwardInput → onData forwards to PTY; we also local-echo for safety
 * - Enter in line-mode can submit to onSubmitLine for sandbox exec
 */
export function WtermPane({
  className,
  cols = 100,
  rows = 28,
  forwardInput = false,
  onReadyWrite,
  onUserData,
  onResize,
  onSubmitLine,
}: WtermPaneProps) {
  const { ref, write, focus, resize } = useTerminal();
  const lineBuf = useRef("");
  const forwardRef = useRef(forwardInput);
  const submitRef = useRef(onSubmitLine);
  const userDataRef = useRef(onUserData);
  forwardRef.current = forwardInput;
  submitRef.current = onSubmitLine;
  userDataRef.current = onUserData;

  useEffect(() => {
    onReadyWrite?.({ write, focus, resize });
  }, [onReadyWrite, write, focus, resize]);

  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", minHeight: "22rem" }}
      onMouseDown={() => focus()}
    >
      <Terminal
        ref={ref}
        theme="light"
        cols={cols}
        rows={rows}
        autoResize={false}
        cursorBlink
        style={{ width: "100%", height: "100%", minHeight: "22rem" }}
        className="lt-wterm-inner"
        onReady={(wt) => {
          wt.write("wterm ready — type here. Press Enter to run a command after Connect.\r\n$ ");
          focus();
        }}
        onData={
          forwardInput || onSubmitLine
            ? (data) => {
                // Built-in echo is off once onData exists — echo ourselves.
                write(data === "\r" ? "\r\n" : data);

                if (forwardRef.current) {
                  userDataRef.current?.(data);
                }

                if (data === "\r" || data === "\n") {
                  const line = lineBuf.current;
                  lineBuf.current = "";
                  if (line.trim()) submitRef.current?.(line);
                  else write("$ ");
                  return;
                }
                if (data === "\u007f" || data === "\b") {
                  lineBuf.current = lineBuf.current.slice(0, -1);
                  return;
                }
                if (data === "\u0015") {
                  lineBuf.current = "";
                  return;
                }
                if (data.length === 1 && data >= " ") {
                  lineBuf.current += data;
                }
              }
            : undefined
        }
        onResize={(nextCols, nextRows) => onResize?.(nextCols, nextRows)}
        onError={(error) => {
          const message = error instanceof Error ? error.message : String(error);
          write(`\r\n[wterm error] ${message}\r\n`);
        }}
      />
    </div>
  );
}
