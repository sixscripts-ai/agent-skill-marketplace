"use client";

import { useEffect } from "react";
import { Terminal, useTerminal } from "@wterm/react";
import "@wterm/react/css";

type WtermPaneProps = {
  className?: string;
  cols?: number;
  rows?: number;
  onReadyWrite?: (api: {
    write: (data: string | Uint8Array) => void;
    focus: () => void;
    resize: (cols: number, rows: number) => void;
  }) => void;
  onUserData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  /** When true, echo keystrokes locally (required when onData is set and remote PTY is not echoing). */
  localEcho?: boolean;
};

/**
 * Documented wterm React integration: useTerminal + onData.
 * Per https://wterm.dev/react — providing onData disables automatic echo,
 * so localEcho must write() when the remote shell is not providing echo.
 */
export function WtermPane({
  className,
  cols = 100,
  rows = 28,
  onReadyWrite,
  onUserData,
  onResize,
  localEcho = true,
}: WtermPaneProps) {
  const { ref, write, focus, resize } = useTerminal();

  useEffect(() => {
    onReadyWrite?.({ write, focus, resize });
  }, [onReadyWrite, write, focus, resize]);

  return (
    <div
      className={className}
      onMouseDown={() => {
        // Ensure hidden input textarea receives keys (wterm focuses on click; reinforce for parent chrome).
        focus();
      }}
    >
      <Terminal
        ref={ref}
        theme="light"
        cols={cols}
        rows={rows}
        autoResize
        cursorBlink
        className="lt-wterm-inner"
        onReady={(wt) => {
          wt.write("# wterm ready — click here and type. Connect for sandbox PTY.\r\n");
          focus();
        }}
        onData={(data) => {
          if (localEcho) write(data);
          onUserData?.(data);
        }}
        onResize={(nextCols, nextRows) => {
          onResize?.(nextCols, nextRows);
        }}
        onError={(error) => {
          console.error("wterm init failed", error);
          write(`\r\n[wterm error] ${error instanceof Error ? error.message : String(error)}\r\n`);
        }}
      />
    </div>
  );
}
