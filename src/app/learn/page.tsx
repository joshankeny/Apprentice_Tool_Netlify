import { requireUser } from "@/lib/auth";
import { XP, MASTERY, getLevelProgress } from "@/lib/training/rules";
import LeaderboardTable, { type LeaderboardRow } from "@/components/leaderboard/LeaderboardTable";

export default async function LearnPage() {
  const { supabase, userId } = await requireUser();

  const [
    { data: attempts },
    { count: totalTools },
    { data: leaderboardData, error: leaderboardError }
  ] = await Promise.all([
    supabase
      .from("attempts")
      .select("tool_id, mode, question_type, is_correct, attempted_at")
      .eq("user_id", userId)
      .order("attempted_at", { ascending: true }),
    supabase
      .from("tools")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.rpc("get_training_leaderboard")
  ]);

  const rows = attempts ?? [];
  const correct = rows.filter((row) => row.is_correct).length;
  const accuracy = rows.length ? (correct / rows.length) * 100 : 0;

  const byTool = new Map<
    string,
    { attempts: number; correct: number; latestCorrect: boolean }
  >();

  for (const row of rows) {
    const current = byTool.get(row.tool_id) ?? {
      attempts: 0,
      correct: 0,
      latestCorrect: false
    };

    current.attempts += 1;
    current.correct += row.is_correct ? 1 : 0;
    current.latestCorrect = row.is_correct;
    byTool.set(row.tool_id, current);
  }

  let mastered = 0;
  for (const stats of byTool.values()) {
    const toolAccuracy = stats.correct / stats.attempts;
    if (
      stats.attempts >= MASTERY.MIN_ATTEMPTS &&
      toolAccuracy >= MASTERY.MIN_ACCURACY &&
      stats.latestCorrect
    ) {
      mastered += 1;
    }
  }

  let attemptXp = 0;
  for (const row of rows) {
    if (!row.is_correct) continue;

    if (row.mode === "FLASHCARD" && row.question_type === "SELF_RATING") {
      attemptXp += XP.FLASHCARD_KNOWN;
    } else if (row.question_type === "scenario") {
      attemptXp += XP.SCENARIO_CORRECT;
    } else {
      attemptXp += XP.QUIZ_CORRECT;
    }
  }

  const xp = attemptXp + mastered * XP.MASTERY_BONUS;
  const level = getLevelProgress(xp);

  const leaderboard: LeaderboardRow[] = leaderboardError
    ? []
    : (leaderboardData ?? []).map((row: Record<string, unknown>) => ({
        userId: String(row.user_id),
        displayName: String(row.display_name ?? "Learner"),
        masteredTools: Number(row.mastered_tools ?? 0),
        attempts: Number(row.attempts ?? 0),
        accuracy: Number(row.accuracy ?? 0),
        currentStreak: Number(row.current_streak ?? 0)
      }));

  return (
    <div className="grid">
      <section className="card grid stats-section" aria-labelledby="stats-heading">
        <h1 id="stats-heading">Your Training Stats</h1>
        <div>
          <h2>Level {level.level}</h2>
          <strong>{xp.toLocaleString()} XP</strong>
          <progress
            className="progress stats-progress"
            value={level.xpIntoLevel}
            max={level.xpNeeded}
            aria-label={`Progress toward Level ${level.level + 1}`}
          />
          <p className="muted">
            {level.xpIntoLevel} / {level.xpNeeded} XP toward Level {level.level + 1}
          </p>
        </div>

        <dl className="grid grid-4 stats-metrics">
          <div>
            <dt className="muted">Tools Mastered</dt>
            <dd className="metric">{mastered} / {totalTools ?? 0}</dd>
          </div>
          <div>
            <dt className="muted">Accuracy</dt>
            <dd className="metric">{accuracy.toFixed(1)}%</dd>
          </div>
          <div>
            <dt className="muted">Attempts</dt>
            <dd className="metric">{rows.length}</dd>
          </div>
          <div>
            <dt className="muted">Tools Practiced</dt>
            <dd className="metric">{byTool.size}</dd>
          </div>
        </dl>
      </section>

      <section className="leaderboard-section" aria-labelledby="leaderboard-heading">
        <div className="leaderboard-heading">
          <div>
            <h2 id="leaderboard-heading">🏆 Training Leaderboard</h2>
            <p className="muted">
              Only learners who choose to appear on the leaderboard are shown.
            </p>
          </div>
        </div>

        {leaderboardError ? (
          <div className="card warning">
            Leaderboard setup is not complete yet. Run the v0.3 Supabase migration and refresh this page.
          </div>
        ) : (
          <LeaderboardTable
            rows={leaderboard}
            currentUserId={userId}
            totalTools={totalTools ?? 0}
          />
        )}
      </section>
    </div>
  );
}
