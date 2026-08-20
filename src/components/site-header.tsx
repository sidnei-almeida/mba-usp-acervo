import { currentUser } from "@/lib/auth";
import { HeaderShell } from "@/components/header-shell";

export async function SiteHeader() {
  const user = await currentUser();
  return <HeaderShell user={user ? { name: user.name ?? user.username } : null} />;
}
