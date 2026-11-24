import { cookies } from "next/headers";
import LeaderboardToggle from "@/components/leaderboard/LeaderboardToggle";
import { getUserProfile, requireUser } from "@/lib/auth";
import { isTrade } from "@/lib/trades";
import { TradePreferences } from "./trade-preferences";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
import { ChangePasswordForm } from "./change-password-form";
import { AppearanceSetting, LogoutButton } from "./profile-controls";

export default async function ProfilePage() {
  await requireUser();
  const [profile, cookieStore] = await Promise.all([getUserProfile(), cookies()]);

  return (
    <div className="grid profile-page">
      <h1>Profile</h1>
      <section className="card grid settings-card" aria-labelledby="profile-heading">
        <h2 id="profile-heading">{profile?.display_name ?? "Learner"}</h2>
        <AppearanceSetting initialTheme={resolveTheme(cookieStore.get(THEME_COOKIE)?.value)} />
        <LeaderboardToggle initialValue={profile?.leaderboard_opt_in ?? true} />
        <LogoutButton />
      </section>
      <TradePreferences initialTrade={isTrade(profile?.trade) ? profile.trade : "general"} initialTradeOnly={profile?.trade_only === true} />
      <ChangePasswordForm />
    </div>
  );
}
