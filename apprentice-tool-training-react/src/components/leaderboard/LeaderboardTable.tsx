"use client";

import { useState } from "react";

export type LeaderboardRow = {
  userId: string;
  displayName: string;
  masteredTools: number;
  attempts: number;
  accuracy: number;
  currentStreak: number;
};

function streakLabel(streak: number) {
  if (streak <= 0) return "😵 0 days";
  return `🔥 ${streak} ${streak === 1 ? "day" : "days"}`;
}

export default function LeaderboardTable({
  rows,
  currentUserId,
  totalTools
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
  totalTools: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? rows : rows.slice(0, 5);

  if (!rows.length) {
    return <div className="card muted">No learners are currently opted in to the leaderboard.</div>;
  }

  return (
    <div className="grid">
      <div className="leaderboard-table-wrap">
        <table className="table leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Learner</th>
              <th>Tools Mastered</th>
              <th>Streak</th>
              <th>Attempts</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const isCurrentUser = row.userId === currentUserId;
              return (
                <tr key={row.userId} className={isCurrentUser ? "leaderboard-you" : undefined}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{row.displayName}</strong>
                    {isCurrentUser ? <span className="you-label"> ← YOU</span> : null}
                  </td>
                  <td>{row.masteredTools}/{totalTools} Tools Mastered</td>
                  <td>{streakLabel(row.currentStreak)}</td>
                  <td>{row.attempts}</td>
                  <td>{row.accuracy.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > 5 ? (
        <button
          type="button"
          className="button secondary leaderboard-expand"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show Top 5" : `Show All ${rows.length} Learners`}
        </button>
      ) : null}
    </div>
  );
}
