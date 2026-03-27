import Image from "next/image";

type SayvelaBrandProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  priority?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "h-8 sm:h-9",
  md: "h-10 sm:h-11",
  lg: "h-12 sm:h-14",
};

export function SayvelaBrand({
  size = "md",
  showTagline = true,
  priority = false,
  className = "",
}: SayvelaBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <Image
        src="/brand/sayvela-wordmark-dark.svg"
        alt="Sayvela"
        width={1080}
        height={320}
        className={`w-auto ${sizeClasses[size]}`}
        priority={priority}
      />
      {showTagline ? (
        <span className="hidden text-xs uppercase tracking-[0.26em] text-cyan-100/62 sm:inline-flex">
          Words are like sails
        </span>
      ) : null}
    </div>
  );
}
