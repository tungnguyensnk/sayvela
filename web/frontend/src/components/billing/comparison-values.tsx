import { CheckIcon, MinusIcon } from "@/components/ui/icons";

export type Value = { kind: "yes" | "no" | "custom" | "text"; text?: string };

export function renderValue(
  value: Value,
  labels: { yes: string; no: string; custom: string },
) {
  if (value.kind === "yes") {
    return (
      <span className="flex justify-center text-ok">
        <CheckIcon width={17} height={17} />
        <span className="sr-only">{labels.yes}</span>
      </span>
    );
  }

  if (value.kind === "no") {
    return (
      <span className="flex justify-center text-faint">
        <MinusIcon width={17} height={17} />
        <span className="sr-only">{labels.no}</span>
      </span>
    );
  }

  if (value.kind === "custom") {
    return (
      <span className="flex justify-center">
        <span className="chip">{labels.custom}</span>
      </span>
    );
  }

  return <span className="tabular text-sm">{value.text}</span>;
}
