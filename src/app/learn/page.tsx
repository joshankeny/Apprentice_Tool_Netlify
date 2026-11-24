import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { XP, MASTERY, getLevelProgress } from "@/lib/training/rules";
import LeaderboardToggle from "@/components/leaderboard/LeaderboardToggle";
import LeaderboardTable, { type LeaderboardRow } from "@/components/leaderboard/LeaderboardTable";

export default async function LearnPage() {
  const { supabase, userId } = await requireUser();

  const [
    { data: profile },
    { data: attempts },
    { count: totalTools },
    { data: leaderboardData, error: leaderboardError }
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, leaderboard_opt_in")
      .eq("id", userId)
      .single(),
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
      <div>
        <h1>⚡ Apprentice Tool Training</h1>
        <div className="warning">
          Prototype application: Training content and data may be incomplete or inaccurate.
          Do not rely on this app as an authoritative source for work procedures,
          safety guidance, or tool requirements.
        </div>
        <p className="muted">
          Signed in as {profile?.display_name ?? "Learner"}
        </p>
      </div>

      <section className="card level-card">
        <div className="level-card-top">
          <div>
            <h2>Level {level.level}</h2>
            <strong>{xp.toLocaleString()} XP</strong>
          </div>
          <LeaderboardToggle initialValue={profile?.leaderboard_opt_in ?? true} />
        </div>
        <div className="progress" style={{ marginTop: ".6rem" }}>
          <div style={{ width: `${level.progress * 100}%` }} />
        </div>
        <p className="muted">
          {level.xpIntoLevel} / {level.xpNeeded} XP toward Level {level.level + 1}
        </p>
      </section>

      <section className="grid grid-4">
        <div className="card">
          <div className="muted">Tools Mastered</div>
          <div className="metric">{mastered} / {totalTools ?? 0}</div>
        </div>
        <div className="card">
          <div className="muted">Accuracy</div>
          <div className="metric">{accuracy.toFixed(1)}%</div>
        </div>
        <div className="card">
          <div className="muted">Attempts</div>
          <div className="metric">{rows.length}</div>
        </div>
        <div className="card">
          <div className="muted">Tools Practiced</div>
          <div className="metric">{byTool.size}</div>
        </div>
      </section>

      <section>
        <h2>Start Training</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>📚 Flashcards</h3>
            <p>Study tool photos, then reveal the name, use, location, and family.</p>
            <Link className="button" href="/learn/flashcards">
              Start Flashcards
            </Link>
          </div>

          <div className="card">
            <h3>🧠 Comprehensive Quiz</h3>
            <p>Mixed questions covering names, locations, families, and scenarios.</p>
            <Link className="button" href="/learn/quiz">
              Start Comprehensive Quiz
            </Link>
          </div>

          <div className="card">
            <h3>🧰 Tool Family Quiz</h3>
            <p>Identify the named tool from four photos in the same family.</p>
            <Link className="button" href="/learn/family-quiz">
              Start Tool Family Quiz
            </Link>
          </div>

          <div className="card">
            <h3>📋 Scenario Quiz</h3>
            <p>Choose an appropriate tool for a practical training scenario.</p>
            <Link className="button" href="/learn/scenario-quiz">
              Start Scenario Quiz
            </Link>
          </div>
        </div>
      </section>

      <section className="leaderboard-section">
        <div className="leaderboard-heading">
          <div>
            <h2>🏆 Training Leaderboard</h2>
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
