export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-sm leading-6 text-neutral-900">
      <code>{code}</code>
    </pre>
  );
}
