import Image from "next/image";

type SayvelaBrandProps = {
  size?: "sm" | "md" | "lg";
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
        className={`block w-auto -translate-y-1 ${sizeClasses[size]}`}
        priority={priority}
      />
    </div>
  );
}
