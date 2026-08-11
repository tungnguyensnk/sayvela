import { AlertIcon } from "@/components/ui/icons";

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
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
        tone === "danger" ? "border-crit/30 bg-crit-soft text-crit" : ""
      }`}
    >
      <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
