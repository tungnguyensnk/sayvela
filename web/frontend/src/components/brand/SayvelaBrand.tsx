type SayvelaBrandProps = {
  size?: "sm" | "md" | "lg";
  /** Giữ lại cho các lời gọi cũ; mark vẽ inline nên không cần preload. */
  priority?: boolean;
  wordmark?: boolean;
  className?: string;
};

const markSize = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

const wordSize = {
  sm: "text-[0.9375rem]",
  md: "text-[1.0625rem]",
  lg: "text-[1.375rem]",
};

/**
 * Hai nét bút xoay đối xứng qua tâm — nét trên là kênh hệ thống, nét dưới là
 * micro của người dùng. Đầu dày đuôi vót để giữ chất viết tay: phía sau phần
 * máy móc vẫn là tiếng người.
 *
 * Hai đường là bản sao quay 180° của nhau quanh tâm (32,32), nên mọi chỉnh sửa
 * phải làm đối xứng ở cả hai.
 */
export function SayvelaMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Sayvela"
    >
      <path
        d="M9 25C19 10 39 7 55 14c-9 4-16 7-23 13-7 6-16 6-23-2z"
        fill="var(--sys)"
      />
      <path
        d="M55 39C45 54 25 57 9 50c9-4 16-7 23-13 7-6 16-6 23 2z"
        fill="var(--mic)"
      />
    </svg>
  );
}

export function SayvelaBrand({
  size = "md",
  wordmark = true,
  className = "",
}: SayvelaBrandProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <SayvelaMark className={markSize[size]} />
      {wordmark ? (
        <span
          className={`font-display font-semibold tracking-[0.085em] text-ink ${wordSize[size]}`}
        >
          SAYVELA
        </span>
      ) : null}
    </span>
  );
}
