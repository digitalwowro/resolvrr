import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/current-user";

export default async function HomePage() {
  const user = await getCurrentUser();

  redirect(user ? "/workspace" : "/login");
}
