import { redirect } from "next/navigation";

export default async function AppDashboardPage() {
  redirect("/dashboard");
}
