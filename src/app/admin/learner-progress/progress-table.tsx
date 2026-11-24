"use client";

import { useState } from "react";
import { TRADES, type Trade } from "@/lib/trades";

const masteryColumns = [
  ["wire", "Wire"], ["line", "Line"], ["meter", "Meter"],
  ["general", "General"], ["overall", "Overall"]
] as const;

type MasteryCounts = Record<(typeof masteryColumns)[number][0], number>;

type ProgressUser = {
  id: string;
  display_name: string;
  trade: Trade;
  active: boolean;
  last_sign_in_at: string | null;
  last_attempt_at: string | null;
  quiz_attempts: number;
  flashcard_attempts: number;
  quiz_accuracy: number | null;
  mastered: MasteryCounts;
};

export type ProgressReport = { totals: MasteryCounts; users: ProgressUser[] };

const pacificDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Los_Angeles"
});

function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  const safeText = /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safeText.replaceAll('"', '""') + '"';
}

function exportCsv(users: ProgressUser[], totals: MasteryCounts) {
  const headings = [
    "Learner", "Trade", "Account status", "Last sign-in (UTC)", "Last attempt (UTC)",
    ...masteryColumns.flatMap(([, label]) => [`${label} mastered`, `${label} published`]),
    "Quiz accuracy (%)", "Quiz attempts", "Flashcard reviews"
  ];
  const rows = users.map((user) => [
    user.display_name, TRADES[user.trade], user.active ? "Active" : "Inactive",
    user.last_sign_in_at ? new Date(user.last_sign_in_at).toISOString() : null,
    user.last_attempt_at ? new Date(user.last_attempt_at).toISOString() : null,
    ...masteryColumns.flatMap(([key]) => [user.mastered[key], totals[key]]),
    user.quiz_accuracy, user.quiz_attempts, user.flashcard_attempts
  ]);
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `learner-progress-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProgressTable({ report }: { report: ProgressReport }) {
  const [trade, setTrade] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const users = report.users.filter((user) =>
    (!trade || user.trade === trade) &&
    (!status || user.active === (status === "active")) &&
    user.display_name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <section className="card grid" aria-label="Learner progress report">
      <div className="grid progress-report-filters">
        <label>Search learners<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label>
          Trade
          <select value={trade} onChange={(event) => setTrade(event.target.value)}>
            <option value="">All trades</option>
            {Object.entries(TRADES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Account status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      <div className="admin-heading">
        <p className="muted admin-count" aria-live="polite">{users.length} of {report.users.length} users</p>
        <button className="button secondary" type="button" disabled={!users.length} onClick={() => exportCsv(users, report.totals)}>
          Export CSV
        </button>
      </div>
      {users.length ? (
        <>
          <p className="muted admin-count" id="progress-report-description">
            Times shown in Pacific time. Last Attempt includes quizzes and flashcards.
            Mastery is shown as mastered / published tools. Shared tools can count in each trade and count once overall.
          </p>
          <div className="admin-table-wrap" role="region" aria-label="Progress results" tabIndex={0}>
            <table className="table progress-report-table" aria-describedby="progress-report-description">
              <thead>
                <tr>
                  <th scope="col">Learner</th><th scope="col">Trade</th><th scope="col">Status</th>
                  <th scope="col">Last Sign-In</th><th scope="col">Last Attempt</th>
                  {masteryColumns.map(([key, label]) => <th scope="col" key={key}>{label} Mastered</th>)}
                  <th scope="col">Quiz Accuracy</th><th scope="col">Quiz Attempts</th><th scope="col">Flashcard Reviews</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <th scope="row">{user.display_name}</th>
                    <td>{TRADES[user.trade]}</td>
                    <td>{user.active ? "Active" : "Inactive"}</td>
                    <td>{user.last_sign_in_at ? pacificDate.format(new Date(user.last_sign_in_at)) : "Never"}</td>
                    <td>{user.last_attempt_at ? pacificDate.format(new Date(user.last_attempt_at)) : "No attempts"}</td>
                    {masteryColumns.map(([key]) => <td key={key}>{user.mastered[key]} / {report.totals[key]}</td>)}
                    <td>{user.quiz_accuracy === null ? "—" : `${user.quiz_accuracy.toFixed(1)}%`}</td>
                    <td>{user.quiz_attempts}</td>
                    <td>{user.flashcard_attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : <p className="muted admin-count">{report.users.length ? "No users match these filters." : "No users found."}</p>}
    </section>
  );
}
