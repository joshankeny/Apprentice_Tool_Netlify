import { cookies } from "next/headers";
import LeaderboardToggle from "@/components/leaderboard/LeaderboardToggle";
import { getUserProfile, requireUser } from "@/lib/auth";
import { THEME_COOKIE } from "@/lib/theme";
import { DarkModeToggle, LogoutButton } from "./profile-controls";

export default async function ProfilePage() {
  await requireUser();
  const [profile, cookieStore] = await Promise.all([getUserProfile(), cookies()]);

  return (
    <div className="grid profile-page">
      <h1>Profile</h1>
      <section className="card grid settings-card" aria-labelledby="profile-heading">
        <h2 id="profile-heading">{profile?.display_name ?? "Learner"}</h2>
        <DarkModeToggle initialDark={cookieStore.get(THEME_COOKIE)?.value === "dark"} />
        <LeaderboardToggle initialValue={profile?.leaderboard_opt_in ?? true} />
        <LogoutButton />
      </section>
    </div>
  );
}
