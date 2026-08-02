/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars, prefer-const */
// @ts-nocheck
export function initCyanLanding(): () => void {

  "use strict";

  const doc = document;
  const root = doc.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const asset = (name) => `/landing-cyan/assets/${name}`;
  const cleanups = [];
  const timeouts = new Set();
  const intervals = new Set();
  const rafs = new Set();
  const observers = [];
  const abort = new AbortController();
  const { signal } = abort;

  const scheduleTimeout = (fn, ms) => {
    const id = window.setTimeout(() => {
      timeouts.delete(id);
      fn();
    }, ms);
    timeouts.add(id);
    return id;
  };
  const clearScheduledTimeout = (id) => {
    if (id != null) {
      window.clearTimeout(id);
      timeouts.delete(id);
    }
  };
  const scheduleInterval = (fn, ms) => {
    const id = window.setInterval(fn, ms);
    intervals.add(id);
    return id;
  };
  const scheduleRaf = (fn) => {
    const id = requestAnimationFrame((t) => {
      rafs.delete(id);
      fn(t);
    });
    rafs.add(id);
    return id;
  };
  const observe = (observer) => {
    observers.push(observer);
    return observer;
  };
  const on = (target, type, handler, options) => {
    if (!target) return;
    const opts = options && typeof options === "object" ? { ...options, signal } : { signal, ...(options ? { capture: options } : {}) };
    target.addEventListener(type, handler, opts);
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showToast(message = "Copied to clipboard") {
    const toast = $("#toast");
    if (!toast) return;
    $("span", toast).textContent = message;
    toast.classList.add("show");
    clearScheduledTimeout(showToast.timer);
    showToast.timer = scheduleTimeout(() => toast.classList.remove("show"), 1900);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast();
    } catch (error) {
      const area = doc.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      doc.body.appendChild(area);
      area.select();
      doc.execCommand("copy");
      area.remove();
      showToast();
    }
  }

  // Theme switcher (preference restored in root layout pre-hydration script).
  on($("#themeToggle"), "click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("agent-skills-cyan-theme", next); } catch (error) {}
    doc.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#ffffff" : "#0a0a0a");
  });

  // Mobile navigation.
  const mobileMenuButton = $("#mobileMenuButton");
  const mobileMenu = $("#mobileMenu");
  function closeMobileMenu() {
    if (!mobileMenuButton || !mobileMenu) return;
    mobileMenuButton.setAttribute("aria-expanded", "false");
    mobileMenuButton.setAttribute("aria-label", "Open navigation menu");
    mobileMenu.classList.remove("open");
    doc.body.classList.remove("menu-open");
  }
  on(mobileMenuButton, "click", () => {
    const open = mobileMenuButton.getAttribute("aria-expanded") === "true";
    mobileMenuButton.setAttribute("aria-expanded", String(!open));
    mobileMenuButton.setAttribute("aria-label", open ? "Open navigation menu" : "Close navigation menu");
    mobileMenu?.classList.toggle("open", !open);
    doc.body.classList.toggle("menu-open", !open);
  });
  $$("a", mobileMenu).forEach((link) => on(link, "click", closeMobileMenu));
  on(window, "resize", () => {
    if (window.innerWidth >= 1024) closeMobileMenu();
  });

  // Scroll state and the compacting playground behavior.
  const siteHeader = $("#siteHeader");
  const playgroundCard = $("#heroPlayground");
  const playgroundAnchor = $("#playground");
  const resultStage = $(".hero-result-stage");
  let playgroundAnchorTop = 0;
  let playgroundStop = 0;

  function measureScrollAnchors() {
    if (!playgroundAnchor || !resultStage) return;
    playgroundAnchorTop = playgroundAnchor.getBoundingClientRect().top + window.scrollY - 90;
    playgroundStop = resultStage.offsetTop + resultStage.offsetHeight - 140;
  }

  function updateScrollState() {
    const y = window.scrollY;
    siteHeader?.classList.toggle("scrolled", y > 18);
    if (playgroundCard) {
      const dock = y > playgroundAnchorTop && y < playgroundStop && window.innerWidth > 460;
      playgroundCard.classList.toggle("is-docked", dock);
    }
  }

  on(window, "load", () => {
    measureScrollAnchors();
    updateScrollState();
  });
  on(window, "resize", () => {
    measureScrollAnchors();
    updateScrollState();
  });
  on(window, "scroll", updateScrollState, { passive: true });

  // Scroll reveal behavior.
  const revealNodes = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("in-view"));
  } else {
    const revealObserver = observe(new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }));
    revealNodes.forEach((node, index) => {
      node.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
      revealObserver.observe(node);
    });
  }

  // Deterministic ambient cyan skill-signal particles.
  function seeded(index) {
    const x = Math.sin(index * 999.91) * 43758.5453;
    return x - Math.floor(x);
  }

  function buildFlameCloud(element, count, offset) {
    if (!element) return;
    const fragment = doc.createDocumentFragment();
    const glyphs = ["+", ".", ":", "*", "x", "o"];
    for (let i = 0; i < count; i += 1) {
      const span = doc.createElement("span");
      span.className = "flame-particle";
      span.textContent = glyphs[Math.floor(seeded(i + offset) * glyphs.length)];
      span.style.left = `${seeded(i + offset + 1) * 94}%`;
      span.style.top = `${seeded(i + offset + 2) * 90}%`;
      span.style.setProperty("--duration", `${2.2 + seeded(i + offset + 3) * 3.8}s`);
      span.style.setProperty("--delay", `${-seeded(i + offset + 4) * 4}s`);
      fragment.appendChild(span);
    }
    element.appendChild(fragment);
  }
  buildFlameCloud($(".flame-cloud-left"), 64, 10);
  buildFlameCloud($(".flame-cloud-right"), 64, 200);

  function buildAsciiFire(element, count, offset) {
    if (!element) return;
    const fragment = doc.createDocumentFragment();
    const glyphs = ["+", ".", ":", "*", "#", "0", "1"];
    for (let i = 0; i < count; i += 1) {
      const span = doc.createElement("span");
      span.className = "ascii-glyph";
      span.textContent = glyphs[Math.floor(seeded(i + offset) * glyphs.length)];
      span.style.left = `${seeded(i + offset + 1) * 100}%`;
      span.style.bottom = `${-20 + seeded(i + offset + 2) * 90}px`;
      span.style.setProperty("--speed", `${4 + seeded(i + offset + 3) * 5}s`);
      span.style.setProperty("--delay", `${-seeded(i + offset + 4) * 7}s`);
      fragment.appendChild(span);
    }
    element.appendChild(fragment);
  }
  buildAsciiFire($(".ascii-fire-left"), 62, 400);
  buildAsciiFire($(".ascii-fire-right"), 62, 800);

  // Playground modes, animated placeholder, and simulated streaming response.
  const endpointTabs = $$("#endpointTabs button");
  const playgroundInput = $("#playgroundInput");
  const playgroundRun = $("#playgroundRun");
  const heroJsonCode = $("#heroJsonCode");
  const resultTitle = $("#playgroundResultTitle");
  const resultMeta = $("#playgroundResultMeta");

  const playgroundModes = {
    browse: {
      label: "Inspect",
      placeholders: ["pr-sentinel", "RAG quality auditor", "skills for code review"],
      title: "Skill inspected",
      meta: "Verified · 6 install targets",
      output: `{
  "skill": "pr-sentinel",
  "trust": "Verified",
  "version": "v2.1.1",
  "evalScore": 96,
  "targets": ["Codex", "Claude", "VS Code"]
}`
    },
    run: {
      label: "Run",
      placeholders: ["pr-sentinel --path ./src", "agent-observer --trace latest", "rag-quality-auditor ./fixtures"],
      title: "Sandbox run completed",
      meta: "Exit 0 · artifacts ready",
      output: `{
  "sandbox": "sbx_01J8M4K",
  "mountedFiles": 14,
  "network": "deny-all",
  "exitCode": 0,
  "artifacts": 3
}`
    },
    trace: {
      label: "Trace",
      placeholders: ["trace run_01J8M4K", "permission decisions", "tool calls and artifacts"],
      title: "Trace streamed",
      meta: "4 steps · permissions honored",
      output: `[
  { "step": "read_files", "status": "ok", "duration": 184 },
  { "step": "shell", "status": "approved", "duration": 920 },
  { "step": "artifacts", "status": "ok", "count": 3 },
  { "step": "summary", "status": "complete" }
]`
    },
    install: {
      label: "Install",
      placeholders: ["pr-sentinel for Codex", "agent-observer for Claude", "skill-format-doctor for VS Code"],
      title: "Install target ready",
      meta: "Portable SKILL.md package",
      output: `{
  "command": "npx asm skill install pr-sentinel",
  "target": "Codex",
  "package": "SKILL.md",
  "verified": true
}`
    }
  };

  let activeMode = "browse";
  let placeholderWordIndex = 0;
  let placeholderCharacterIndex = 0;
  let placeholderDeleting = false;
  let placeholderTimer = null;

  function placeholderTick() {
    if (!playgroundInput || doc.activeElement === playgroundInput || playgroundInput.value) {
      placeholderTimer = scheduleTimeout(placeholderTick, 450);
      return;
    }
    const words = playgroundModes[activeMode].placeholders;
    const word = words[placeholderWordIndex % words.length];
    if (!placeholderDeleting) {
      placeholderCharacterIndex += 1;
      playgroundInput.placeholder = word.slice(0, placeholderCharacterIndex);
      if (placeholderCharacterIndex >= word.length) {
        placeholderDeleting = true;
        placeholderTimer = scheduleTimeout(placeholderTick, 1200);
        return;
      }
    } else {
      placeholderCharacterIndex -= 1;
      playgroundInput.placeholder = word.slice(0, Math.max(0, placeholderCharacterIndex));
      if (placeholderCharacterIndex <= 0) {
        placeholderDeleting = false;
        placeholderWordIndex += 1;
      }
    }
    placeholderTimer = scheduleTimeout(placeholderTick, placeholderDeleting ? 24 : 46);
  }

  function renderPlaygroundOutput(mode) {
    const data = playgroundModes[mode];
    if (!heroJsonCode) return;
    const highlighted = escapeHtml(data.output)
      .replace(/(&quot;[^&]+?&quot;)(?=\s*:)/g, "<b>$1</b>")
      .replace(/:\s*(&quot;.*?&quot;)/g, ": <em>$1</em>")
      .replace(/\b(true|false|null)\b/g, "<em>$1</em>");
    heroJsonCode.innerHTML = `<code>${highlighted}</code>`;
    if (resultTitle) resultTitle.textContent = data.title;
    if (resultMeta) resultMeta.textContent = data.meta;
  }

  function selectPlaygroundMode(mode) {
    if (!playgroundModes[mode]) return;
    activeMode = mode;
    endpointTabs.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    if (playgroundRun) $("span", playgroundRun).textContent = playgroundModes[mode].label;
    placeholderCharacterIndex = 0;
    placeholderDeleting = false;
    if (playgroundInput && !playgroundInput.value) playgroundInput.placeholder = playgroundModes[mode].placeholders[0];
    renderPlaygroundOutput(mode);
  }

  endpointTabs.forEach((button) => {
    on(button, "click", () => selectPlaygroundMode(button.dataset.mode));
  });

  function runPlayground() {
    if (!playgroundCard || playgroundCard.classList.contains("loading")) return;
    const data = playgroundModes[activeMode];
    if (playgroundInput && !playgroundInput.value.trim()) {
      playgroundInput.value = data.placeholders[0];
    }
    playgroundCard.classList.add("loading");
    if (resultTitle) resultTitle.textContent = `${data.label} in progress...`;
    if (resultMeta) resultMeta.textContent = "Starting controlled workflow";
    if (heroJsonCode) heroJsonCode.innerHTML = `<code>{\n  <b>"status"</b>: <em>"processing"</em>,\n  <b>"workflow"</b>: <em>"${activeMode}"</em>\n}</code>`;
    scheduleTimeout(() => {
      playgroundCard.classList.remove("loading");
      renderPlaygroundOutput(activeMode);
    }, reduceMotion ? 40 : 1200);
  }

  on(playgroundRun, "click", runPlayground);
  on(playgroundInput, "keydown", (event) => {
    if (event.key === "Enter") runPlayground();
  });
  selectPlaygroundMode("browse");
  if (!reduceMotion) placeholderTick();

  // Copy controls.
  $$('[data-copy-target]').forEach((button) => {
    on(button, "click", () => {
      const target = doc.getElementById(button.dataset.copyTarget);
      if (target) copyText(target.textContent.trim());
    });
  });
  $$('[data-copy-text]').forEach((button) => {
    on(button, "click", () => copyText(button.dataset.copyText || ""));
  });

  // Logo cloud timed swaps.
  const logos = [
    [asset("logo-codex.svg"), "Codex"],
    [asset("logo-claude.svg"), "Claude"],
    [asset("logo-opencode.svg"), "OpenCode"],
    [asset("logo-grok.svg"), "Grok"],
    [asset("logo-vscode.svg"), "VS Code"],
    [asset("logo-antigravity.svg"), "Antigravity"],
    [asset("logo-mcp.svg"), "MCP"],
    [asset("logo-vercel.svg"), "Vercel Sandbox"],
    [asset("logo-prisma.svg"), "Prisma"],
    [asset("logo-next.svg"), "Next.js"]
  ];
  const logoTiles = $$("#logoTiles .logo-tile");
  let logoSwapStep = 5;
  if (!reduceMotion && logoTiles.length) {
    scheduleInterval(() => {
      const tileIndex = logoSwapStep % logoTiles.length;
      const logoIndex = logoSwapStep % logos.length;
      const tile = logoTiles[tileIndex];
      const image = $("img", tile);
      tile.classList.add("swapping");
      scheduleTimeout(() => {
        image.src = logos[logoIndex][0];
        image.alt = logos[logoIndex][1];
        tile.classList.remove("swapping");
      }, 260);
      logoSwapStep += 1;
    }, 2100);
  }

  // Feature/code demo.
  const featureButtons = $$("#featureSelector .feature-card");
  const languageButtons = $$("#languageTabs button");
  const codeDemoCode = $("#codeDemoCode");
  const codeDemoOutput = $("#codeDemoOutput");
  let activeFeature = "search";
  let activeLanguage = "python";

  const codeSamples = {
    search: {
      python: `---
name: pr-sentinel
description: Review pull requests for behavior and security risk.
allowed-tools:
  - read_files
  - shell
targets:
  - Codex
  - Claude
  - VS Code
---

# PR Sentinel
Return severity-ranked findings with file references.`,
      node: `npx asm skill inspect pr-sentinel \
  --show permissions,evals,versions`,
      curl: `{
  "slug": "pr-sentinel",
  "trust": "Verified",
  "version": "v2.1.1",
  "permissions": ["read_files", "shell:ask", "network"]
}`,
      cli: `01 package ........ verified
02 permissions .... reviewed
03 eval-suite ...... 31/34 passed
04 install-targets . 6 compatible`
    },
    scrape: {
      python: `---
name: agent-observer
description: Trace agent runs, tool calls, cost, and failures.
allowed-tools:
  - read_files
  - network
---`,
      node: `npx asm skill run agent-observer \
  --sandbox \
  --network deny-all \
  --mount ./traces`,
      curl: `{
  "runtime": "vercel-sandbox",
  "network": "deny-all",
  "filesystem": "workspace:read",
  "shell": "ask",
  "timeoutSeconds": 120
}`,
      cli: `$ connect sandbox
mounted: 14 files
policy: permissions honored
exit: 0
artifacts: trace.json, summary.md`
    },
    interact: {
      python: `---
name: skill-format-doctor
targets:
  - Codex
  - Claude
  - OpenCode
  - Grok
  - VS Code
---`,
      node: `npx asm skill install skill-format-doctor \
  --target codex`,
      curl: `{
  "entry": "SKILL.md",
  "format": "portable-skill-package",
  "target": "Codex",
  "provenance": "marketplace:verified"
}`,
      cli: `resolving version v1.3.0
verifying package ........ ok
copying SKILL.md .......... ok
install complete`
    }
  };

  const featureOutputs = {
    search: `[ INSPECT ]

Skill: PR Sentinel
Trust: Verified
Version: v2.1.1
Eval score: 91
Permissions: read_files, shell:ask, network
Targets: Codex, Claude, OpenCode, Grok, VS Code`,
    scrape: `[ SANDBOX RUN ]

Session: sbx_01J8M4K
Mounted files: 14
Network: deny-all
Shell: approved once
Exit: 0
Artifacts: 3
Duration: streamed`,
    interact: `[ INSTALL ]

Package: skill-format-doctor@v1.3.0
Target: Codex
Entry: SKILL.md
Provenance: verified
Status: installed`
  };

  function highlightSource(source) {
    let html = escapeHtml(source);
    html = html.replace(/(^|\n)(\s*#.*)/g, "$1<span class=\"comment\">$2</span>");
    html = html.replace(/(&quot;.*?&quot;)/g, "<span class=\"string\">$1</span>");
    html = html.replace(/\b(from|import|const|await|new|print|curl)\b/g, "<span class=\"keyword\">$1</span>");
    html = html.replace(/\b(Agent|Skill|inspect|run|install|permissions|Verified|Codex|Claude)\b/g, "<span class=\"function\">$1</span>");
    return html;
  }

  function highlightOutput(source) {
    let html = escapeHtml(source);
    html = html.replace(/(^|\n)(#.*)/g, "$1<span class=\"accent\">$2</span>");
    html = html.replace(/(&quot;[^&]+?&quot;)(?=\s*:)/g, "<span class=\"accent\">$1</span>");
    return html;
  }

  function renderCodeDemo() {
    const source = codeSamples[activeFeature][activeLanguage];
    if (codeDemoCode) codeDemoCode.innerHTML = highlightSource(source);
    if (codeDemoOutput) codeDemoOutput.innerHTML = highlightOutput(featureOutputs[activeFeature]);
    const fileLabel = $(".source-code .code-file-label");
    const labels = { python: "SKILL.md", node: "install.sh", curl: "manifest.json", cli: "trace.log" };
    if (fileLabel) fileLabel.textContent = labels[activeLanguage];
  }

  featureButtons.forEach((button) => {
    on(button, "click", (event) => {
      if (event.target.closest("a")) return;
      activeFeature = button.dataset.feature;
      featureButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderCodeDemo();
    });
  });
  languageButtons.forEach((button) => {
    on(button, "click", () => {
      activeLanguage = button.dataset.language;
      languageButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderCodeDemo();
    });
  });
  renderCodeDemo();

  // Agent command mode.
  const commandSwitchButtons = $$("#agentCommandSwitch button");
  const agentCommand = $("#agentCommand");
  const agentCommands = {
    skill: "npx asm skill install pr-sentinel",
    mcp: "npx asm skill inspect pr-sentinel --json"
  };
  commandSwitchButtons.forEach((button) => {
    on(button, "click", () => {
      commandSwitchButtons.forEach((item) => item.classList.toggle("active", item === button));
      if (agentCommand) agentCommand.textContent = agentCommands[button.dataset.command];
    });
  });

  // Performance chart counters.
  function animateNumber(element, target, suffix = "", duration = 1100) {
    if (!element) return;
    if (reduceMotion) {
      element.textContent = `${target}${suffix}`;
      return;
    }
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) scheduleRaf(frame);
    }
    scheduleRaf(frame);
  }

  const chart = $("[data-chart]");
  if (chart) {
    const activateChart = () => {
      $$("[data-width]", chart).forEach((bar) => { bar.style.width = `${bar.dataset.width}%`; });
      $$("[data-counter]", chart).forEach((counter) => animateNumber(counter, Number(counter.dataset.counter), "%", 1400));
    };
    if (reduceMotion) activateChart();
    else {
      const chartObserver = observe(new IntersectionObserver((entries, observer) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          activateChart();
          observer.disconnect();
        }
      }, { threshold: 0.35 }));
      chartObserver.observe(chart);
    }
  }

  // Live latency stream.
  const latencyStream = $("#latencyStream");
  const latencyUrls = [
    "pr-sentinel", "agent-observer", "rag-quality-auditor",
    "skill-format-doctor", "research-brief-builder", "incident-postmortem",
    "release-notes-writer", "repository-mapper"
  ];
  let latencyIndex = 0;
  function latencyRow(index) {
    const base = 47 + Math.floor(seeded(index + 1000) * 8);
    return `<div><span>${latencyUrls[index % latencyUrls.length]}</span><span>${base} ms</span><span>${base + 32} ms</span></div>`;
  }
  if (latencyStream) {
    latencyStream.innerHTML = Array.from({ length: 7 }, (_, i) => latencyRow(i)).join("");
    if (!reduceMotion) {
      scheduleInterval(() => {
        latencyIndex += 1;
        latencyStream.insertAdjacentHTML("beforeend", latencyRow(latencyIndex + 7));
        latencyStream.style.transform = "translateY(-28px)";
        scheduleTimeout(() => {
          latencyStream.firstElementChild?.remove();
          latencyStream.style.transition = "none";
          latencyStream.style.transform = "translateY(0)";
          scheduleRaf(() => { latencyStream.style.transition = "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)"; });
        }, 420);
      }, 1350);
    }
  }

  // Token filtering loop.
  const tokenCount = $("#tokenCount");
  const discardLines = $$("#tokenLines .discard");
  let tokenFiltered = false;
  function toggleTokenFilter() {
    tokenFiltered = !tokenFiltered;
    discardLines.forEach((line) => line.classList.toggle("filtered", tokenFiltered));
    if (tokenCount) tokenCount.textContent = tokenFiltered ? "5" : "24";
  }
  if (!reduceMotion) scheduleInterval(toggleTokenFilter, 2700);

  // Media parsing carousel.
  const mediaItems = [
    ["eve://project/SKILL.md", "SKILL"],
    ["eve://project/tools.json", "TOOLS"],
    ["eve://project/tests/evals.json", "EVALS"]
  ];
  let mediaIndex = 0;
  const mediaStage = $(".media-stage");
  const mediaUrl = $("#mediaUrl");
  const mediaType = $("#mediaType");
  const parseStatus = $("#parseStatus");
  if (!reduceMotion && mediaStage) {
    scheduleInterval(() => {
      mediaStage.classList.add("changing");
      if (parseStatus) parseStatus.textContent = "Ready";
      scheduleTimeout(() => {
        mediaIndex = (mediaIndex + 1) % mediaItems.length;
        if (mediaUrl) mediaUrl.textContent = mediaItems[mediaIndex][0];
        if (mediaType) mediaType.textContent = mediaItems[mediaIndex][1];
        if (parseStatus) parseStatus.textContent = "Generating...";
        mediaStage.classList.remove("changing");
      }, 420);
    }, 4200);
  }

  // Smart wait timer.
  const waitTimer = $("#waitTimer");
  if (waitTimer && !reduceMotion) {
    const waitStart = performance.now();
    function tickWait(now) {
      const elapsed = ((now - waitStart) / 1000) % 3.4;
      waitTimer.textContent = `${elapsed.toFixed(1)}s`;
      scheduleRaf(tickWait);
    }
    scheduleRaf(tickWait);
  }

  // Sequential browser actions and cursor motion.
  const actionButtons = $$("#actionsGrid button");
  const actionPointer = $("#actionPointer");
  let actionIndex = 0;
  function activateAction(index) {
    actionButtons.forEach((button, i) => button.classList.toggle("active", i === index));
    if (!actionPointer || !actionButtons[index]) return;
    const button = actionButtons[index];
    const grid = $("#actionsGrid");
    const buttonRect = button.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const x = buttonRect.left - gridRect.left + buttonRect.width * 0.72;
    const y = buttonRect.top - gridRect.top + buttonRect.height * 0.55;
    actionPointer.style.transform = `translate(${x}px, ${y}px)`;
  }
  activateAction(0);
  if (!reduceMotion && actionButtons.length) {
    scheduleInterval(() => {
      actionIndex = (actionIndex + 1) % actionButtons.length;
      activateAction(actionIndex);
    }, 1150);
  }

  // Live sandbox routing status.
  const wikiStatus = $("#wikiStatus");
  const wikiRoute = $("#wikiRoute");
  const wikiStates = [
    ["Creating sandbox...", "Allocating Vercel Sandbox runtime"],
    ["Mounting skill package", "PTY connected · policy loaded"],
    ["Session ready", "Grok agent and shell share one sandbox"]
  ];
  let wikiIndex = 0;
  if (!reduceMotion && wikiStatus) {
    scheduleInterval(() => {
      wikiIndex = (wikiIndex + 1) % wikiStates.length;
      wikiStatus.textContent = wikiStates[wikiIndex][0];
      if (wikiRoute) wikiRoute.textContent = wikiStates[wikiIndex][1];
    }, 1900);
  }

  // Use case workbench.
  const useCaseTabs = $$("#useCaseTabs button");
  const useCaseCanvas = $("#useCaseCanvas");
  const useCaseTitle = $("#useCaseTitle");
  const customerProof = $("#customerProof");

  const useCases = {
    research: {
      title: "Marketplace discovery",
      customer: "SixScripts AI",
      logo: asset("logo-sixscripts.svg"),
      proof: "publishes portable, inspectable skills with visible permissions, evals, versions, and install targets.",
      render: () => `<div class="research-demo"><div class="research-list">
        <div><span>CR</span><p>Code review</p><b data-found="18">0 found</b></div>
        <div><span>OB</span><p>Observability</p><b data-found="12">0 found</b></div>
        <div><span>RT</span><p>Retrieval</p><b data-found="9">0 found</b></div>
        <div><span>RS</span><p>Research</p><b data-found="14">0 found</b></div>
        <div><span>SO</span><p>SkillOps</p><b data-found="11">0 found</b></div>
      </div><div class="ask-box"><svg><use href="#icon-search"></use></svg><span>Search skills, authors, use cases...</span></div></div>`
    },
    chat: {
      title: "EVE · Intent → Craft → Agent → Prove → Ship",
      customer: "EVE Builder",
      logo: asset("logo-eve.svg"),
      proof: "turns a plain-language agent brief into files, tool contracts, approval gates, tests, and an exportable project.",
      render: () => `<div class="chat-demo">
        <div class="chat-bubble user">Build an incident postmortem agent that reads logs, cites evidence, and never exposes secrets.</div>
        <div class="chat-bubble">I created the brief, SKILL.md, tool contracts, approval matrix, and three evaluation cases.<span class="source-chip">Intent complete</span></div>
        <div class="chat-bubble user">Require approval before shell or network access.</div>
        <div class="chat-bubble">Updated the contract: read_files allowed, shell and network ask, secret access blocked.<span class="source-chip">Ready for Prove</span></div>
      </div>`
    },
    agents: {
      title: "Project Studio · Build → Prove → Ship",
      customer: "Project Studio",
      logo: asset("logo-projects.svg"),
      proof: "supports both new skills and imported packages through a guided, validation-first workflow.",
      render: () => `<div class="agent-demo"><div class="agent-terminal"><div><span>Project Studio</span><span>Intent · Craft · Files · Contract · Prove · Ship</span></div><pre><b>01</b> Intent      <b>complete</b>
<b>02</b> Craft       <b>complete</b>
<b>03</b> Files       <b>12 packaged</b>
<b>04</b> Contract    <b>3 permissions</b>
<b>05</b> Prove       <b>8/8 passed</b>
<b>06</b> Ship        <span style="color:#6f777c">ready to export</span></pre></div></div>`
    },
    onboarding: {
      title: "$ live-terminal",
      customer: "Live Terminal",
      logo: asset("logo-terminal.svg"),
      proof: "connects a real PTY and AI agent to the same Vercel Sandbox session for controlled code execution.",
      render: () => `<div class="onboarding-demo"><div><h4>Sandbox session</h4><p>Select a skill, load its policy, and connect the PTY.</p><div class="onboarding-fields"><span>skill: pr-sentinel</span><span>network: deny-all</span><span>pty: connected</span></div></div><i></i><div><h4>Agent ready</h4><p>Run commands or ask the selected model to work inside the same session.</p><div class="onboarding-fields"><span>model: Grok agent</span><span>mounted: 14 files</span><span>status: ready</span></div></div></div>`
    },
    leads: {
      title: "SkillOps control plane",
      customer: "Skill Registry",
      logo: asset("logo-marketplace.svg"),
      proof: "keeps trust level, versions, permissions, eval results, runs, traces, and artifacts attached to each skill.",
      render: () => `<div class="leads-demo">
        <div class="lead-card"><img src="${asset("skill-observer.svg")}" alt="Agent Observer"><b>Agent Observer</b><small>Verified · v1.4.0</small><div class="lead-tags"><span>96 eval</span><span>Trace</span><span>1.8K runs</span></div></div>
        <div class="lead-card"><img src="${asset("skill-rag.svg")}" alt="RAG Quality Auditor"><b>RAG Quality Auditor</b><small>Reviewed · v0.9.2</small><div class="lead-tags"><span>93 eval</span><span>Retrieval</span></div></div>
        <div class="lead-card"><img src="${asset("skill-pr.svg")}" alt="PR Sentinel"><b>PR Sentinel</b><small>Verified · v2.1.1</small><div class="lead-tags"><span>91 eval</span><span>Code review</span></div></div>
        <div class="lead-card"><img src="${asset("skill-doctor.svg")}" alt="Skill Format Doctor"><b>Skill Format Doctor</b><small>Verified · v1.3.0</small><div class="lead-tags"><span>Format</span><span>SkillOps</span></div></div>
      </div>`
    }
  };

  function animateResearchCounts() {
    $$("[data-found]", useCaseCanvas).forEach((element, index) => {
      const target = Number(element.dataset.found);
      if (reduceMotion) {
        element.textContent = `${target} found`;
        return;
      }
      scheduleTimeout(() => {
        const start = performance.now();
        function frame(now) {
          const p = Math.min(1, (now - start) / 900);
          element.textContent = `${Math.round(target * (1 - Math.pow(1 - p, 3)))} found`;
          if (p < 1) scheduleRaf(frame);
        }
        scheduleRaf(frame);
      }, index * 130);
    });
  }

  function renderUseCase(key, immediate = false) {
    const data = useCases[key];
    if (!data || !useCaseCanvas) return;
    useCaseTabs.forEach((button) => button.classList.toggle("active", button.dataset.usecase === key));
    useCaseCanvas.classList.add("changing");
    const render = () => {
      useCaseCanvas.innerHTML = data.render();
      if (useCaseTitle) useCaseTitle.textContent = data.title;
      if (customerProof) {
        const image = $("img", customerProof);
        const paragraph = $("p", customerProof);
        if (image) { image.src = data.logo; image.alt = data.customer; }
        if (paragraph) paragraph.innerHTML = `<b>${escapeHtml(data.customer)}</b> ${escapeHtml(data.proof)}`;
      }
      useCaseCanvas.classList.remove("changing");
      if (key === "research") animateResearchCounts();
    };
    scheduleTimeout(render, immediate || reduceMotion ? 0 : 190);
  }

  useCaseTabs.forEach((button) => on(button, "click", () => renderUseCase(button.dataset.usecase)));
  renderUseCase("research", true);

  // Testimonial marquees. Each row is duplicated for a seamless loop.
  const tweets = [
    { initials: "IN", name: "Inspect", handle: "@marketplace", text: "Read instructions, permissions, compatibility, evals, and version history before install or run." },
    { initials: "SB", name: "Sandbox run", handle: "@runtime", text: "Execute skills with explicit controls, network policy, mounted files, and a complete trace." },
    { initials: "PS", name: "Portable skills", handle: "@skills", text: "One human-readable package can target Codex, Claude, OpenCode, Grok, and VS Code." },
    { initials: "EV", name: "EVE", handle: "@builder", text: "Move from Intent to Craft, Agent, Prove, and Ship without losing project context." },
    { initials: "PJ", name: "Projects", handle: "@studio", text: "Create or import a skill, validate its contract, run tests, and export the complete package." },
    { initials: "PM", name: "Permissions", handle: "@trust", text: "Every file, shell, network, browser, and secret request is visible before execution." },
    { initials: "TR", name: "Trace", handle: "@observability", text: "Tool calls, decisions, outputs, artifacts, latency, and failures stay attached to the run." },
    { initials: "OS", name: "Open source", handle: "@github", text: "Inspect the product code and understand how the marketplace, builders, and runtime work." }
  ];

  function tweetCard(tweet) {
    const marked = escapeHtml(tweet.text).replace(/(Inspect|Sandbox|Portable|EVE|Projects|Permissions|Trace|Open source)/g, "<mark>$1</mark>");
    return `<article class="tweet-card"><div class="tweet-author"><span class="tweet-avatar">${tweet.initials}</span><div><b>${escapeHtml(tweet.name)}</b><small>${escapeHtml(tweet.handle)}</small></div><span>[ POST ]</span></div><p>${marked}</p></article>`;
  }

  const rowOne = $("#tweetRowOne");
  const rowTwo = $("#tweetRowTwo");
  const firstSet = tweets.slice(0, 4).map(tweetCard).join("");
  const secondSet = tweets.slice(4).map(tweetCard).join("");
  if (rowOne) rowOne.innerHTML = firstSet + firstSet;
  if (rowTwo) rowTwo.innerHTML = secondSet + secondSet;

  // FAQ content and accordion.
  const faqData = [
    {
      group: "General",
      items: [
        ["What is Agent Skill Marketplace?", "A place to discover, inspect, evaluate, run, version, trace, export, and install portable AI agent skills."],
        ["What is a portable agent skill?", "A human-readable package centered on SKILL.md that describes activation, workflow, tools, permissions, examples, validation, and compatibility targets."],
        ["Can I run a skill before installing it?", "Yes. Open the run lab or live terminal to execute the skill in a controlled sandbox, review artifacts, and inspect the resulting trace."],
        ["Which agent environments are supported?", "The repository currently defines install targets for Codex, Claude, Antigravity, OpenCode, Grok, and VS Code."],
        ["Is the project open source?", "Yes. The application source is available in the sixscripts-ai/agent-skill-marketplace GitHub repository."]
      ]
    },
    {
      group: "Marketplace & Trust",
      items: [
        ["What can I inspect before running a skill?", "Each listing can expose instructions, trust level, permissions, compatibility, versions, eval suites, install targets, reviews, and provenance."],
        ["How do permissions work?", "Skills declare capabilities such as read files, write files, network, shell, browser, or API keys. High-risk actions can be allowed, blocked, or placed behind approval."],
        ["What do Verified, Reviewed, and Experimental mean?", "They communicate the level of review and confidence attached to a listing. Eval results and version history provide additional evidence."],
        ["Are versions and regressions tracked?", "Yes. Skills can retain version history, changelogs, eval results, scores, passed and failed cases, and regression counts."],
        ["How do marketplace filters work?", "You can search by name, summary, author, category, compatibility, permission, trust level, popularity, rating, and update recency."]
      ]
    },
    {
      group: "EVE & Projects",
      items: [
        ["What does EVE build?", "EVE generates and refines a durable AI agent project, including its brief, SKILL.md, project files, tool contracts, approval matrix, tests, and export package."],
        ["What are the EVE chapters?", "Intent describes the agent, Craft manages project files, Agent defines tools and gates, Prove runs tests, and Ship saves or downloads the project."],
        ["Can I import an existing skill?", "Yes. Project Studio supports both creating a new skill and importing a package before moving through validation, configuration, tests, and export."],
        ["Can I download the generated project?", "Yes. EVE's Ship chapter can export the generated agent files as a ZIP after the project has been prepared."],
        ["Can projects be saved to an account?", "The project workflow includes account-backed saving as well as local package export."]
      ]
    },
    {
      group: "Runtime & Install",
      items: [
        ["How does the live terminal work?", "It connects a browser terminal to a Vercel Sandbox PTY, mounts the selected skill, and lets commands and the configured AI agent operate in the same isolated session."],
        ["Can destructive commands require confirmation?", "Yes. The terminal client carries an explicit destructive-command confirmation control into execution requests."],
        ["How do agents install skills?", "Use the install target published with the skill or copy its SKILL.md package into the supported agent environment."],
        ["What is recorded in a trace?", "A trace can include tool calls, permission decisions, command output, artifacts, latency, exit state, and a run summary."],
        ["Do I need an API key?", "Marketplace browsing and inspection can be separate from model or sandbox credentials. AI generation and provider-backed terminal features may require the relevant configured credentials."]
      ]
    }
  ];

  const faqGroups = $("#faqGroups");
  if (faqGroups) {
    faqGroups.innerHTML = faqData.map((group, groupIndex) => `
      <section class="faq-group reveal ${groupIndex === 0 ? "in-view" : ""}">
        <h3 class="faq-group-title">${escapeHtml(group.group)}</h3>
        <div class="faq-list">
          ${group.items.map((item, itemIndex) => `
            <article class="faq-item ${groupIndex === 0 && itemIndex === 0 ? "open" : ""}">
              <button class="faq-question" type="button" aria-expanded="${groupIndex === 0 && itemIndex === 0 ? "true" : "false"}"><span>${escapeHtml(item[0])}</span><i><svg><use href="#icon-chevron"></use></svg></i></button>
              <div class="faq-answer"><div><p>${escapeHtml(item[1])}</p></div></div>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");

    $$(".faq-question", faqGroups).forEach((button) => {
      on(button, "click", () => {
        const item = button.closest(".faq-item");
        const list = button.closest(".faq-list");
        const opening = !item.classList.contains("open");
        $$(".faq-item", list).forEach((other) => {
          other.classList.remove("open");
          $(".faq-question", other)?.setAttribute("aria-expanded", "false");
        });
        if (opening) {
          item.classList.add("open");
          button.setAttribute("aria-expanded", "true");
        }
      });
    });

    if (!reduceMotion && "IntersectionObserver" in window) {
      const faqRevealObserver = observe(new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.04 }));
      $$(".faq-group.reveal", faqGroups).forEach((group) => faqRevealObserver.observe(group));
    } else {
      $$(".faq-group.reveal", faqGroups).forEach((group) => group.classList.add("in-view"));
    }
  }

  // Agent setup modal.
  const agentModal = $("#agentModal");
  const setupAgentsButton = $("#setupAgentsButton");
  let lastFocused = null;
  function openAgentModal() {
    if (!agentModal) return;
    lastFocused = doc.activeElement;
    agentModal.classList.add("open");
    agentModal.setAttribute("aria-hidden", "false");
    doc.body.classList.add("modal-open");
    $(".modal-close", agentModal)?.focus();
  }
  function closeAgentModal() {
    if (!agentModal) return;
    agentModal.classList.remove("open");
    agentModal.setAttribute("aria-hidden", "true");
    doc.body.classList.remove("modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }
  on(setupAgentsButton, "click", openAgentModal);
  $$('[data-close-modal]', agentModal).forEach((element) => on(element, "click", closeAgentModal));
  on(doc, "keydown", (event) => {
    if (event.key === "Escape") {
      closeAgentModal();
      closeMobileMenu();
    }
  });

  // Prevent empty demo links from jumping unexpectedly while preserving normal section navigation.
  $$('a[href="#top"]').forEach((link) => {
    on(link, "click", () => closeMobileMenu());
  });


  // Runtime readiness badge (same source as /api/health/ui).
  const statusPill = $(".status-pill");
  if (statusPill) {
    const applyStatus = (label) => {
      statusPill.innerHTML = `<i></i>[ ${label} ]`;
    };
    applyStatus("CHECKING");
    fetch("/api/health/ui")
      .then((res) => res.json())
      .then((data) => {
        if (signal.aborted) return;
        applyStatus(data.statusLabel || "VIRTUAL RUNTIME");
      })
      .catch(() => {
        if (!signal.aborted) applyStatus("VIRTUAL RUNTIME");
      });
  }

  // Desktop nav disclosure semantics.
  $$(".nav-item.has-menu > button").forEach((button) => {
    const menu = button.parentElement?.querySelector(".nav-menu");
    if (!menu) return;
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    const sync = () => button.setAttribute("aria-expanded", button.parentElement.matches(":hover, :focus-within") ? "true" : "false");
    on(button.parentElement, "mouseenter", sync);
    on(button.parentElement, "mouseleave", sync);
    on(button.parentElement, "focusin", sync);
    on(button.parentElement, "focusout", sync);
  });

  // Re-measure after generated content affects document height.
  scheduleRaf(() => {
    measureScrollAnchors();
    updateScrollState();
  });

  return () => {
    abort.abort();
    timeouts.forEach((id) => window.clearTimeout(id));
    timeouts.clear();
    intervals.forEach((id) => window.clearInterval(id));
    intervals.clear();
    rafs.forEach((id) => cancelAnimationFrame(id));
    rafs.clear();
    observers.forEach((observer) => observer.disconnect());
    observers.length = 0;
    cleanups.forEach((cleanup) => cleanup());
    cleanups.length = 0;
    doc.body.classList.remove("menu-open", "modal-open");
    closeMobileMenu();
    closeAgentModal();
  };
}
