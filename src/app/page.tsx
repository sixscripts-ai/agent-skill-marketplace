import Link from "next/link";
import { ArrowRight, Code, Database, Globe, LineChart, ShoppingCart, Zap } from "lucide-react";

const CATEGORIES = [
  { name: "Ecommerce", icon: ShoppingCart, description: "Manage stores, products, and checkout flows.", color: "text-blue-500" },
  { name: "Coding", icon: Code, description: "Format, lint, test, and write code automatically.", color: "text-green-500" },
  { name: "Research", icon: Globe, description: "Search the web, read documentation, and summarize.", color: "text-purple-500" },
  { name: "Automation", icon: Zap, description: "Connect APIs, run workflows, and schedule tasks.", color: "text-yellow-500" },
  { name: "Marketing", icon: LineChart, description: "Generate copy, manage campaigns, and track metrics.", color: "text-pink-500" },
  { name: "Data Analysis", icon: Database, description: "Query databases, build charts, and find insights.", color: "text-cyan-500" },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-6 border-b border-neutral-800">
        <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-neutral-400" />
          Agent Skill Marketplace
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/marketplace" className="text-neutral-400 hover:text-white transition-colors">
            Marketplace
          </Link>
          <Link href="/docs" className="text-neutral-400 hover:text-white transition-colors">
            Documentation
          </Link>
          <Link href="/builder" className="text-neutral-400 hover:text-white transition-colors">
            Builder
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-24 px-6">
        <div className="max-w-4xl w-full text-center space-y-8">
          <div className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1 text-sm font-medium text-neutral-300">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            Public Beta Now Live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white !leading-tight">
            Find ready to use skills for Codex, Claude Code, Cursor, and AI agents.
          </h1>
          
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Browse, run, evaluate, and install portable AI agent skills with traced execution. Turn your AI from a chatbot into a capable software engineer.
          </p>

          <div className="flex items-center justify-center gap-4 pt-8">
            <Link 
              href="/marketplace" 
              className="inline-flex h-12 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200"
            >
              Browse Marketplace
            </Link>
            <Link 
              href="/builder" 
              className="inline-flex h-12 items-center justify-center rounded-md border border-neutral-800 bg-transparent px-8 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Publish a Skill <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="max-w-5xl w-full mt-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-white">Explore by Category</h2>
            <p className="text-neutral-400 mt-2">Find the right tool for your agent's next task.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <div key={cat.name} className="cyber-card p-6 flex flex-col items-start gap-4 hover:border-neutral-700 transition-colors cursor-pointer group">
                <div className="p-3 rounded-md bg-neutral-900 border border-neutral-800 group-hover:bg-neutral-800 transition-colors">
                  <cat.icon className={`h-6 w-6 ${cat.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{cat.name}</h3>
                  <p className="text-sm text-neutral-400 mt-1">{cat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-neutral-500 border-t border-neutral-800 mt-auto">
        &copy; {new Date().getFullYear()} Agent Skill Marketplace.
      </footer>
    </div>
  );
}
