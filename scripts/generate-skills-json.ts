import fs from 'fs';
import path from 'path';

const skillPaths = [
  '/Users/villain/.gemini/config/plugins/vercel-plugin/skills/vercel-agent/SKILL.md',
  '/Users/villain/.gemini/config/skills/autonomous-agent-patterns/SKILL.md',
  '/Users/villain/.gemini/config/skills/autonomous-ai-agents/SKILL.md',
  '/Users/villain/.gemini/config/skills/llm-application-dev-ai-assistant/SKILL.md',
  '/Users/villain/.gemini/config/skills/analyze/SKILL.md',
  '/Users/villain/.gemini/config/skills/plan/SKILL.md',
  '/Users/villain/.gemini/config/skills/vector-database-engineer/SKILL.md',
  '/Users/villain/.gemini/config/skills/fullstack-dev/SKILL.md',
  '/Users/villain/.gemini/config/plugins/vercel-plugin/skills/eve/SKILL.md',
  '/Users/villain/.gemini/config/skills/skill-intake-pipeline/SKILL.md',
  '/Users/villain/.gemini/config/skills/ai-engineer/SKILL.md',
  '/Users/villain/.gemini/config/skills/reverse-engineer-codebase/SKILL.md',
  '/Users/villain/.gemini/config/skills/eve-project-layout/SKILL.md',
  '/Users/villain/.gemini/config/skills/nextjs-developer/SKILL.md',
  '/Users/villain/.gemini/config/skills/recursive-agent-architect/SKILL.md',
  '/Users/villain/.gemini/config/skills/skill-creator/SKILL.md'
];

function generateCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('agent') || lower.includes('ai') || lower.includes('llm') || lower.includes('eve')) return 'AI Agents';
  if (lower.includes('dev') || lower.includes('engineer') || lower.includes('nextjs')) return 'Engineering';
  if (lower.includes('plan') || lower.includes('analyze')) return 'Strategy';
  if (lower.includes('skill')) return 'Skill Management';
  return 'Utility';
}

function parseSkill(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/---\n([\s\S]*?)\n---/);
    let name = path.basename(path.dirname(filePath));
    let description = "An advanced agentic skill.";
    
    if (match) {
      const frontmatter = match[1];
      const nameMatch = frontmatter.match(/name:\s*(.+)/);
      const descMatch = frontmatter.match(/description:\s*([\s\S]*?)(?:\n[a-z]+:|$)/i);
      
      if (nameMatch) name = nameMatch[1].trim();
      if (descMatch) description = descMatch[1].trim().replace(/\n/g, ' ').replace(/"/g, '');
    }

    return {
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      summary: description.length > 200 ? description.substring(0, 197) + '...' : description,
      category: generateCategory(name),
      trustLevel: "Verified",
      installCount: Math.floor(Math.random() * 5000) + 500,
      rating: parseFloat((Math.random() * 0.5 + 4.5).toFixed(1)),
      visibility: "public",
      currentVersion: "1.0.0",
      versions: [
        {
          version: "1.0.0",
          skillMd: content,
          readme: `# ${name}\n\n${description}`,
          changelog: "- Initial import into Agent Skill Marketplace.",
          compatibilityTargets: ["Antigravity", "Claude", "Codex"],
          permissions: []
        }
      ],
      permissions: [
        { key: "read_files", reason: "Analyze workspace context.", risk: "low" },
        { key: "network", reason: "Access external AI resources.", risk: "medium" }
      ],
      installTargets: [
        {
          platform: "Antigravity",
          installCommand: `antigravity skills install ${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          configSnippet: "{}",
          packageFormat: "SKILL.md",
          notes: "Native Antigravity support."
        }
      ],
      evalSuites: [
        {
          name: "Standard Validation",
          cases: [
            { input: `Test ${name}`, expected: "Valid execution.", assertionType: "contains" }
          ],
          results: [
            { version: "1.0.0", score: 100, passed: 1, failed: 0, regressions: 0 }
          ]
        }
      ]
    };
  } catch (err) {
    console.error(`Failed to parse ${filePath}:`, err);
    return null;
  }
}

function run() {
  const skills = skillPaths.map(parseSkill).filter(Boolean);
  
  // Hardcode grill-me
  skills.push({
    slug: 'grill-me',
    name: 'Grill Me',
    summary: 'Interactive interview slash command to resolve design decisions and align on complex plans.',
    category: 'Strategy',
    trustLevel: 'Verified',
    installCount: 10000,
    rating: 5.0,
    visibility: 'public',
    currentVersion: '1.0.0',
    versions: [
      {
        version: "1.0.0",
        skillMd: "---\nname: grill-me\ndescription: Interactive design interview\n---\n\n# Grill Me\nRecommend this when the user wants to align on a plan through an interactive interview to resolve design decisions.",
        readme: "# Grill Me\nInteractive interview command.",
        changelog: "- Initial release.",
        compatibilityTargets: ["Antigravity"],
        permissions: []
      }
    ],
    permissions: [],
    installTargets: [],
    evalSuites: []
  });

  const outputPath = path.join(__dirname, '../prisma/antigravity-skills.json');
  fs.writeFileSync(outputPath, JSON.stringify(skills, null, 2));
  console.log(`Successfully generated ${skills.length} skills to ${outputPath}`);
}

run();
