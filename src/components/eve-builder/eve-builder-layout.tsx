"use client";

import { useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { EveAiChat } from "./eve-ai-chat";
import { EveProjectWorkspaceClient } from "./eve-project-workspace-client";

export function EveBuilderLayout() {
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);

  return (
    <div className={`eve-builder-layout${workspaceCollapsed ? " is-workspace-collapsed" : ""}`}>
      <div className="eve-builder-chat-column">
        {workspaceCollapsed ? (
          <div className="eve-builder-expand-bar">
            <button
              type="button"
              className="builder-secondary-button"
              onClick={() => setWorkspaceCollapsed(false)}
              aria-expanded={false}
              aria-controls="eve-project-workspace-panel"
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
              Show workspace
            </button>
          </div>
        ) : null}
        <EveAiChat />
      </div>
      {!workspaceCollapsed ? (
        <EveProjectWorkspaceClient onCollapse={() => setWorkspaceCollapsed(true)} />
      ) : null}
    </div>
  );
}
