export function SectionLoading({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <div className="glass-panel p-6 text-sm text-white/58">{label}</div>
    </div>
  );
}
