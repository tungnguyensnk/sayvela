"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

interface AuthActionsProps {
  compact?: boolean;
}

export function AuthActions({ compact = false }: AuthActionsProps) {
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email ?? session?.user?.name ?? "user";

  if (status === "loading") {
    return (
      <div
        className={`flex ${
          compact ? "flex-col items-stretch" : "flex-wrap items-center"
        } gap-3`}
        aria-busy="true"
      >
        <div className="glass-chip text-center text-sm text-white/80 animate-pulse">
          Checking session…
        </div>
        <div
          className="glass-button w-48 opacity-60 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="primary-button w-40 opacity-60 pointer-events-none"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div
        className={`flex ${
          compact ? "flex-col items-stretch" : "flex-wrap items-center"
        } gap-3`}
      >
        <div className="glass-chip text-center text-sm text-white/80">
          Active session · {userEmail}
        </div>
        <Link href="/settings/billing" className="glass-button text-center">
          Manage
        </Link>
        <button
          type="button"
          className="glass-button"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
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
        Sign in
      </Link>
      <Link href="/auth?mode=register" className="primary-button text-center">
        Create account
      </Link>
    </div>
  );
}
