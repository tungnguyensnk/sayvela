import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getLoginUrl } from "@/lib/auth-guard-utils";

export * from "@/lib/auth-guard-utils";

export async function requireAuth(callbackUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(getLoginUrl(callbackUrl));
  }
  return session;
}
