"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Download, FileCode2, KeyRound, Play, RotateCcw, Save, Sparkles, WandSparkles } from "lucide-react";
import { architectAgentProject } from "@/app/actions/agent-project-architect";
import { ApiSettingsModal } from "../api-settings-modal";
import { AGENT_MODEL_OPTIONS, AGENT_TOOL_CATALOG, MARKETPLACE_SKILL_CATALOG, createDefaultAgentProject, downloadAgentProject, mergeArchitectProject, runAgentTest, synchronizeAgentProject, validateAgentProject, type AgentPermissionDecision, type AgentProject } from "@/lib/eve/agent-project";

type Step = "brief" | "models" | "capabilities" | "instructions" | "safety" | "test" | "finish";
const steps: Array<[Step, string]> = [["brief","Agent brief"],["models","Models and runtime"],["capabilities","Tools and skills"],["instructions","Project files"],["safety","Safety and memory"],["test","Test and debug"],["finish","Export and deploy"]];

export function EveLifecycleClient() {
  const [project, setProject] = useState<AgentProject>(() => createDefaultAgentProject());
  const [step, setStep] = useState<Step>("brief");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [architectPrompt, setArchitectPrompt] = useState("");
  const [architectBusy, setArchitectBusy] = useState(false);
  const [architectError, setArchitectError] = useState("");
  const [selectedFile, setSelectedFile] = useState("instructions.md");
  const [checkpoint, setCheckpoint] = useState<AgentProject | null>(null);
  const [saved, setSaved] = useState(false);
  const readiness = useMemo(() => validateAgentProject(project), [project]);
  const activeFile = project.files.find((file) => file.path === selectedFile) ?? project.files[0];

  function update(next: AgentProject) { setProject(synchronizeAgentProject(next)); setSaved(false); }
  function patch(next: Partial<AgentProject>) { update({ ...project, ...next }); }
  function setMetadata(key: keyof AgentProject["metadata"], value: string) { patch({ metadata: { ...project.metadata, [key]: value } }); }
  function setBrief(key: keyof AgentProject["brief"], value: string) { patch({ brief: { ...project.brief, [key]: value } }); }
  function toggleArray<T>(items: T[], value: T) { return items.includes(value) ? items.filter((item) => item !== value) : [...items, value]; }

  async function runArchitect() {
    if (!architectPrompt.trim() || architectBusy) return;
    setArchitectBusy(true); setArchitectError(""); setCheckpoint(project);
    try {
      const storedKeys = JSON.parse(localStorage.getItem("ai_api_keys") || "{}") as Record<string, string>;
      const result = await architectAgentProject(architectPrompt, project, project.architectModel, storedKeys);
      const merged = mergeArchitectProject(project, result);
      const changedFiles = Array.isArray(result.files) && result.files.length ? result.files.map((file) => file.path).filter(Boolean) : merged.files.map((file) => file.path);
      update({ ...merged, changes: [{ id: crypto.randomUUID(), label: architectPrompt, createdAt: new Date().toISOString(), files: changedFiles }, ...project.changes] });
      setArchitectPrompt("");
      if (changedFiles[0]) setSelectedFile(changedFiles[0]);
    } catch (error) { setArchitectError(error instanceof Error ? error.message : String(error)); }
    finally { setArchitectBusy(false); }
  }

  function saveDraft() { localStorage.setItem("eve_agent_project", JSON.stringify(project)); setSaved(true); }
  function restoreDraft() { const raw = localStorage.getItem("eve_agent_project"); if (raw) update(JSON.parse(raw) as AgentProject); }
  function updateFile(content: string) { setProject({ ...project, files: project.files.map((file) => file.path === activeFile?.path ? { ...file, content, generated: false } : file) }); setSaved(false); }

  return <div className="eve-agent-studio eve-lifecycle">
    <header className="eve-studio-header"><div><div className="eve-eyebrow">Eve Agent Architect</div><h1>Build, test, and export a production-ready agent</h1><p>Define the operating brief, configure models and capabilities, review every file, test approval behavior, and package deployment-ready outputs.</p></div><div className="eve-header-actions"><span className={`eve-ready-pill ${readiness.blocking.length ? "" : "eve-ready-pill-complete"}`}>{readiness.score}/100 readiness</span><button className="builder-secondary-button" onClick={() => setSettingsOpen(true)}><KeyRound className="size-4"/>API keys</button><button className="builder-primary-button" onClick={() => void downloadAgentProject(project)}><Download className="size-4"/>Download ZIP</button></div></header>

    <section className="eve-architect"><div className="eve-architect-title"><span><Sparkles className="size-5"/></span><div><div className="eve-eyebrow">Project-wide AI Architect</div><h2>Describe the agent or request a change</h2><p>Architect can revise the brief, models, runtime, tools, skills, permissions, tests, and generated project files.</p></div></div><div className="eve-architect-composer"><textarea className="builder-textarea" value={architectPrompt} onChange={(event) => setArchitectPrompt(event.target.value)} placeholder="Build an ecommerce marketing agent that researches competitors, installs growth skills, and asks before publishing."/><div className="eve-architect-actions"><select className="builder-compact-select" value={project.architectModel} onChange={(event) => patch({ architectModel: event.target.value })}>{AGENT_MODEL_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button className="builder-primary-button" disabled={!architectPrompt.trim() || architectBusy} onClick={() => void runArchitect()}><WandSparkles className="size-4"/>{architectBusy ? "Architecting..." : "Apply project update"}</button>{checkpoint ? <button className="builder-secondary-button" onClick={() => { update(checkpoint); setCheckpoint(null); }}><RotateCcw className="size-4"/>Undo</button> : null}</div>{architectError ? <div className="eve-issue">{architectError}</div> : null}</div></section>

    <nav className="eve-stepper" aria-label="Agent workflow">{steps.map(([id,label],index) => <button key={id} className={step === id ? "active" : ""} onClick={() => setStep(id)}><span>{index+1}</span>{label}<ChevronRight className="size-4"/></button>)}</nav>

    <main className="eve-flow-main">
      {step === "brief" ? <Section title="Agent brief" description="Define the operating contract before generating implementation details."><div className="eve-form-grid"><Field label="Display name"><input className="builder-input" value={project.metadata.displayName} onChange={(e)=>setMetadata("displayName",e.target.value)}/></Field><Field label="Directory name"><input className="builder-input" value={project.metadata.directoryName} onChange={(e)=>setMetadata("directoryName",e.target.value)}/></Field><Field label="Description" wide><textarea className="builder-textarea" value={project.metadata.description} onChange={(e)=>setMetadata("description",e.target.value)}/></Field>{(["purpose","users","inputs","outputs","successCriteria","constraints","approvals"] as const).map((key)=><Field key={key} label={labelize(key)} wide><textarea className="builder-textarea" value={project.brief[key]} onChange={(e)=>setBrief(key,e.target.value)}/></Field>)}</div></Section> : null}

      {step === "models" ? <Section title="Models, runtime, memory, and deployment" description="Choose separate Architect and runtime models, then configure how the exported agent operates."><div className="eve-form-grid"><Field label="Architect model"><select className="builder-input" value={project.architectModel} onChange={(e)=>patch({architectModel:e.target.value})}>{AGENT_MODEL_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Runtime model"><select className="builder-input" value={project.runtimeModel} onChange={(e)=>patch({runtimeModel:e.target.value})}>{AGENT_MODEL_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Execution mode"><select className="builder-input" value={project.runtime.executionMode} onChange={(e)=>patch({runtime:{...project.runtime,executionMode:e.target.value as AgentProject["runtime"]["executionMode"]}})}><option value="read-only">Read-only</option><option value="supervised">Supervised</option><option value="autonomous">Autonomous within limits</option><option value="custom">Custom</option></select></Field><Field label="Memory"><select className="builder-input" value={project.runtime.memory} onChange={(e)=>patch({runtime:{...project.runtime,memory:e.target.value as AgentProject["runtime"]["memory"]}})}><option value="none">No memory</option><option value="session">Session</option><option value="persistent">Persistent</option><option value="vector">Vector knowledge base</option><option value="database">Database state</option></select></Field><Field label="Maximum steps"><input type="number" className="builder-input" value={project.runtime.maxSteps} onChange={(e)=>patch({runtime:{...project.runtime,maxSteps:Number(e.target.value)}})}/></Field></div><h3 className="eve-subtitle">Deployment profiles</h3><div className="eve-choice-grid">{(["local","vercel","docker","github-actions"] as const).map((target)=><button key={target} className={project.runtime.deploymentTargets.includes(target)?"selected":""} onClick={()=>patch({runtime:{...project.runtime,deploymentTargets:toggleArray(project.runtime.deploymentTargets,target)}})}>{labelize(target)}</button>)}</div><CredentialList project={project} update={update}/></Section> : null}

      {step === "capabilities" ? <Section title="Tools and marketplace skills" description="Add capabilities, inspect required credentials, and install reusable marketplace skills."><h3 className="eve-subtitle">Tools</h3><div className="eve-card-grid">{AGENT_TOOL_CATALOG.map((tool)=><button key={tool.id} className={project.tools.includes(tool.id)?"selected":""} onClick={()=>patch({tools:toggleArray(project.tools,tool.id)})}><strong>{tool.name}</strong><span>{tool.description}</span></button>)}</div><h3 className="eve-subtitle">Marketplace skills</h3><div className="eve-card-grid">{MARKETPLACE_SKILL_CATALOG.map((skill)=>{const installed=project.skills.some((item)=>item.slug===skill.slug);return <button key={skill.slug} className={installed?"selected":""} onClick={()=>patch({skills:installed?project.skills.filter((item)=>item.slug!==skill.slug):[...project.skills,skill]})}><strong>{skill.name}</strong><span>{skill.summary}</span><small>{skill.permissions.join(" · ")}</small></button>})}</div></Section> : null}

      {step === "instructions" ? <Section title="Editable project workspace" description="Review generated files, edit any file directly, and use checkpoints to recover from unwanted changes."><div className="eve-file-workspace"><aside>{project.files.map((file)=><button key={file.path} className={selectedFile===file.path?"active":""} onClick={()=>setSelectedFile(file.path)}><FileCode2 className="size-4"/>{file.path}</button>)}</aside><div><div className="eve-file-toolbar"><strong>{activeFile?.path}</strong><span>{activeFile?.generated?"Generated":"Edited"}</span></div><textarea className="eve-code-editor" value={activeFile?.content??""} onChange={(e)=>updateFile(e.target.value)} spellCheck={false}/></div></div></Section> : null}

      {step === "safety" ? <Section title="Permissions and approval policies" description="Decide which actions are allowed, approval-gated, or blocked."><div className="eve-policy-list">{project.permissions.map((policy)=><div key={policy.id}><div><strong>{policy.label}</strong><span>{policy.description}</span></div><select className="builder-compact-select" value={policy.decision} onChange={(e)=>patch({permissions:project.permissions.map((item)=>item.id===policy.id?{...item,decision:e.target.value as AgentPermissionDecision}:item)})}><option value="allow">Allow</option><option value="ask">Ask every time</option><option value="block">Block</option></select></div>)}</div></Section> : null}

      {step === "test" ? <Section title="Test and debug" description="Run quick, scenario, and safety checks. Failed tests remain visible as readiness blockers."><div className="eve-test-list">{project.tests.map((test)=><div key={test.id}><div><strong>{test.name}</strong><span>{test.kind} · {test.input}</span>{test.output?<p>{test.output}</p>:null}</div><TestBadge status={test.status}/><button className="builder-secondary-button" onClick={()=>update(runAgentTest(project,test.id))}><Play className="size-4"/>Run</button></div>)}</div><button className="builder-secondary-button" onClick={()=>patch({tests:[...project.tests,{id:crypto.randomUUID(),name:"New scenario",input:"Describe the scenario.",expected:["expected behavior"],kind:"scenario",status:"idle"}]})}>Add scenario</button></Section> : null}

      {step === "finish" ? <Section title="Readiness, export, and deployment" description="Review blockers, save a draft, and download the complete deployment-ready project."><div className="eve-readiness-grid">{readiness.sections.map((section)=><div key={section.id} className={section.issues.length?"warning":"passed"}><strong>{section.label}</strong><span>{section.issues.length?section.issues.join(" "):"Passed"}</span></div>)}</div><div className="eve-manifest"><strong>{project.metadata.directoryName}-eve-agent.zip</strong><span>{project.files.length} files · {project.tools.length} tools · {project.skills.length} skills · {project.environment.length} environment variables</span></div><div className="eve-finish-actions"><button className="builder-secondary-button" onClick={saveDraft}><Save className="size-4"/>{saved?"Draft saved":"Save browser draft"}</button><button className="builder-secondary-button" onClick={restoreDraft}>Restore draft</button><button className="builder-primary-button" onClick={()=>void downloadAgentProject(project)}><Download className="size-4"/>Download agent ZIP</button></div></Section> : null}
    </main>

    <aside className="eve-readiness-rail"><div className="eve-score"><strong>{readiness.score}</strong><span>/100</span></div>{readiness.blocking.slice(0,6).map((issue)=><div className="eve-issue" key={issue}>{issue}</div>)}{!readiness.blocking.length?<div className="eve-result"><CheckCircle2 className="size-4"/>All readiness checks passed.</div>:null}<h3>Recent Architect changes</h3>{project.changes.slice(0,4).map((change)=><div className="eve-change" key={change.id}><strong>{change.label}</strong><span>{change.files.length} files affected</span></div>)}</aside>
    <ApiSettingsModal isOpen={settingsOpen} onClose={()=>setSettingsOpen(false)}/>
  </div>;
}

function Section({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <section className="eve-flow-section"><header><div><h2>{title}</h2><p>{description}</p></div></header><div>{children}</div></section>}
function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}){return <label className={wide?"wide":""}><span>{label}</span>{children}</label>}
function labelize(value:string){return value.replace(/-/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,(char)=>char.toUpperCase())}
function CredentialList({project,update}:{project:AgentProject;update:(project:AgentProject)=>void}){return <><h3 className="eve-subtitle">Environment requirements</h3><div className="eve-credential-list">{project.environment.map((item)=><div key={item.name}><div><strong>{item.name}</strong><span>{item.source} · {item.required?"Required":"Optional"} · {item.secret?"Secret":"Public"}</span></div><button className={item.configured?"configured":""} onClick={()=>update({...project,environment:project.environment.map((env)=>env.name===item.name?{...env,configured:!env.configured}:env)})}>{item.configured?"Configured":"Mark configured"}</button></div>)}</div></>}
function TestBadge({status}:{status:string}){return <span className={`eve-test-badge ${status}`}>{status}</span>}
