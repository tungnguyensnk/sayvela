"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useI18n } from "@/i18n/client";

interface AuthActionsProps {
  compact?: boolean;
}

export function AuthActions({ compact = false }: AuthActionsProps) {
  const { data: session, status } = useSession();
  const { m } = useI18n();
  const userEmail = session?.user?.email ?? session?.user?.name ?? m.nav.account;
  const wrapper = compact
    ? "flex flex-col items-stretch gap-2"
    : "flex flex-wrap items-center gap-2";

  if (status === "loading") {
    return (
      <div className={wrapper} aria-busy="true">
        <span className="chip">{m.nav.checkingSession}</span>
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className={wrapper}>
        <span className="chip chip-ok max-w-[16rem] truncate">
          {m.nav.activeSession(userEmail)}
        </span>
        <Link href="/settings/billing" className="btn btn-secondary btn-sm">
          {m.common.manage}
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          {m.nav.signOutShort}
        </button>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Link href="/auth?mode=login" className="btn btn-ghost">
        {m.nav.signIn}
      </Link>
      <Link href="/auth?mode=register" className="btn btn-primary">
        {m.nav.createAccount}
      </Link>
    </div>
  );
}
