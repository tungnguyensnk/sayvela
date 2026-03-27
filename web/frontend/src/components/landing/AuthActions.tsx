"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

interface AuthActionsProps {
  compact?: boolean;
}

export function AuthActions({ compact = false }: AuthActionsProps) {
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email ?? session?.user?.name ?? "người dùng";

  if (status === "authenticated") {
    return (
      <div
        className={`flex ${
          compact ? "flex-col items-stretch" : "flex-wrap items-center"
        } gap-3`}
      >
        <div className="glass-chip text-center text-sm text-white/80">
          Phiên đang hoạt động · {userEmail}
        </div>
        <button
          type="button"
          className="glass-button"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex ${
        compact ? "flex-col items-stretch" : "flex-wrap items-center"
      } gap-3`}
    >
      <Link href="/auth?mode=login" className="glass-button text-center">
        Đăng nhập
      </Link>
      <Link href="/auth?mode=register" className="primary-button text-center">
        Tạo tài khoản
      </Link>
    </div>
  );
}
