export function FormMessage({
  children,
  tone,
}: {
  children: string;
  tone: "danger";
}) {
  return (
    <div
      role="alert"
      className={`rounded-3xl px-4 py-3 text-sm ${
        tone === "danger" ? "border border-rose-300/18 bg-rose-400/10 text-rose-100" : ""
      }`}
    >
      {children}
    </div>
  );
}
