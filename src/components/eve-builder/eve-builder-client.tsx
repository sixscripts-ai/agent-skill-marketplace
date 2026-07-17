"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, Download, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { DEFAULT_INSTRUCTIONS_MD } from "@/lib/eve/eve-templates";
import { generateEveZip, type AgentState } from "@/lib/eve/export-utils";
import { ApiSettingsModal } from "../api-settings-modal";
import { MetadataPanel } from "./metadata-panel";
import { CapabilitiesPanel } from "./capabilities-panel";
import { OrchestratorEditor } from "./orchestrator-editor";
import { PreviewExportPanel } from "./preview-export-panel";

export function EveBuilderClient(){
 const [state,setState]=useState<AgentState>({agentName:"research-operations-agent",model:"google/gemini-2.5-pro",instructions:DEFAULT_INSTRUCTIONS_MD,selectedTools:["firecrawl_mcp"]});
 const [settings,setSettings]=useState(false);
 const issues=useMemo(()=>validate(state),[state]);
 const updateState=(updates:Partial<AgentState>)=>setState(current=>({...current,...updates}));
 return <div className="eve-agent-studio">
  <header className="eve-studio-header"><div><div className="eve-eyebrow">Eve Agent Studio</div><h1>Build a runnable agent project</h1><p>Design the agent, refine its instructions, review tools and project files, validate readiness, and export one complete Eve workspace.</p></div><div className="eve-header-actions"><span className={`eve-ready-pill ${issues.length?"":"eve-ready-pill-complete"}`}><ShieldCheck className="size-4"/>{issues.length?`${issues.length} issue${issues.length===1?"":"s"}`:"Ready"}</span><button className="builder-secondary-button" onClick={()=>setSettings(true)}><KeyRound className="size-4"/>API keys</button><button className="builder-primary-button" disabled={!!issues.length} onClick={()=>void generateEveZip(state)}><Download className="size-4"/>Export agent</button></div></header>
  <section className="eve-architect"><div className="eve-architect-title"><span><Sparkles className="size-5"/></span><div><div className="eve-eyebrow">Primary creation workspace</div><h2>Design the agent with AI Architect</h2><p>Ask Architect to create or improve the operating instructions. The configuration, generated filesystem, and readiness review remain visible below.</p></div></div><div className="eve-architect-editor"><OrchestratorEditor state={state} updateState={updateState}/></div></section>
  <div className="eve-workspace-grid">
   <div className="eve-stack"><Panel title="Agent configuration"><MetadataPanel state={state} updateState={updateState}/></Panel><Panel title="Tools and capabilities"><CapabilitiesPanel state={state} updateState={updateState}/></Panel></div>
   <Panel title="Generated project" className="eve-project-panel"><PreviewExportPanel state={state}/><div className="eve-instructions-preview"><h3>instructions.md</h3><textarea value={state.instructions} onChange={e=>updateState({instructions:e.target.value})} spellCheck={false}/></div></Panel>
   <div className="eve-stack"><Panel title="Readiness"><div className="eve-score"><strong>{Math.max(0,100-issues.length*20)}</strong><span>/100</span></div>{issues.length?issues.map(issue=><div className="eve-issue" key={issue}>{issue}</div>):<div className="eve-result"><CheckCircle2 className="size-4"/>Identity, instructions, model, and export structure are ready.</div>}</Panel><Panel title="Project summary"><dl className="eve-summary"><div><dt>Model</dt><dd>{state.model}</dd></div><div><dt>Tools</dt><dd>{state.selectedTools.length}</dd></div><div><dt>Mode</dt><dd>Supervised</dd></div><div><dt>Files</dt><dd>{6+state.selectedTools.length}</dd></div></dl></Panel><Panel title="Export"><p className="eve-muted">The ZIP contains agent code, instructions, tool files, skill slots, configuration, environment guidance, and documentation.</p><button className="builder-primary-button w-full mt-3" disabled={!!issues.length} onClick={()=>void generateEveZip(state)}><Download className="size-4"/>Download agent ZIP</button></Panel></div>
  </div><ApiSettingsModal isOpen={settings} onClose={()=>setSettings(false)}/>
 </div>
}
function Panel({title,children,className=""}:{title:string;children:React.ReactNode;className?:string}){return <section className={`eve-panel ${className}`}><header><h2>{title}</h2></header><div className="eve-panel-body">{children}</div></section>}
function validate(state:AgentState){const issues:string[]=[];if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.agentName))issues.push("Use a lowercase hyphenated agent name.");if(state.instructions.length<180)issues.push("Add a complete operating policy.");for(const heading of ["Identity","Goals","Tools"])if(!state.instructions.toLowerCase().includes(heading.toLowerCase()))issues.push(`Instructions need a ${heading} section.`);return issues}
