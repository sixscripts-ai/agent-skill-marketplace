export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-200">
      <code>{code}</code>
    </pre>
  );
}
