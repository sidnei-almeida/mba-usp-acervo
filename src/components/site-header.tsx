import { currentUser } from "@/lib/auth";
import { portraitOf } from "@/lib/avatar-url";
import { HeaderShell } from "@/components/header-shell";

export async function SiteHeader() {
  const user = await currentUser();
  if (!user) return <HeaderShell user={null} />;

  const portrait = await portraitOf(user);
  return (
    <HeaderShell
      user={{ name: portrait.name, avatarUrl: portrait.url, house: portrait.house }}
    />
  );
}
