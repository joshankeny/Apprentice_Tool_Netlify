"use client";

import { useState } from "react";
import RoundSetup from "@/components/training/RoundSetup";

type Option = { tool_id: string; formal_name: string; image_url: string };
type Question = {
  question_id: string;
  prompt: string;
  family_name: string;
  options: Option[];
};
type Result = { correct: boolean; correct_tool_id: string };

export default function FamilyQuiz() {
  const [targetCount, setTargetCount] = useState(10);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [number, setNumber] = useState(0);
  const [score, setScore] = useState(0);

  async function loadQuestion(nextNumber: number) {
    setBusy(true);
    setQuestion(null);
    setSelected(null);
    setResult(null);
    setMessage("");

    try {
      const response = await fetch("/api/family-quiz/question", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load question.");
      setQuestion(body);
      setNumber(nextNumber);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load question.");
    } finally {
      setBusy(false);
    }
  }

  function begin(count: number) {
    setTargetCount(count);
    setScore(0);
    setNumber(0);
    setComplete(false);
    setStarted(true);
    void loadQuestion(1);
  }

  async function submit() {
    if (!question || !selected || result || busy) return;
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/family-quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: question.question_id,
          selected_tool_id: selected
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not submit answer.");
      setResult(body);
      if (body.correct) setScore((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit answer.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (number >= targetCount) {
      setComplete(true);
      return;
    }
    void loadQuestion(number + 1);
  }

  if (!started) {
    return (
      <RoundSetup
        label="Number of Questions"
        buttonLabel="Begin Quiz"
        defaultCount={targetCount}
        onBegin={begin}
      />
    );
  }

  if (complete) {
    return (
      <div className="card grid">
        <h2>Quiz complete!</h2>
        <p><strong>{score} / {targetCount}</strong> correct ({Math.round(score / targetCount * 100)}%)</p>
        <button className="button" type="button" onClick={() => setStarted(false)}>
          Start Another Round
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="card grid">
        {busy ? (
          <p role="status">Loading question…</p>
        ) : (
          <>
            <div className="warning" role="alert">{message || "No question available."}</div>
            <button className="button" type="button" onClick={() => loadQuestion(number + 1)}>
              Try Again
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="quiz-status">
        <strong>Question {number} of {targetCount}</strong>
        <span>Score: {score}</span>
      </div>
      <div className="progress">
        <div style={{ width: `${number / targetCount * 100}%` }} />
      </div>
      <div>
        <h2>{question.prompt}</h2>
        <p className="muted">Family: {question.family_name}</p>
      </div>
      <div className="photo-grid">
        {question.options.map((option) => {
          const isSelected = option.tool_id === selected;
          const correct = result?.correct_tool_id === option.tool_id;
          const wrong = Boolean(result && isSelected && !result.correct);
          const state = correct ? "correct" : wrong ? "wrong" : isSelected ? "selected" : "";

          return (
            <div className="photo-option" key={option.tool_id}>
              <button
                type="button"
                className={`photo-choice ${state}`}
                disabled={Boolean(result) || busy}
                aria-label={`Select ${option.formal_name}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(option.tool_id)}
              >
                <img src={option.image_url} alt="" />
                {(correct || wrong) && (
                  <span className={`badge ${state}`}>{correct ? "✓" : "✕"}</span>
                )}
              </button>
              {result && <strong>{option.formal_name}</strong>}
            </div>
          );
        })}
      </div>
      {message && <div className="warning" role="alert">{message}</div>}
      {result ? (
        <button className="button" type="button" onClick={next}>
          {number >= targetCount ? "Finish Quiz" : "Next Question"}
        </button>
      ) : (
        <button className="button" type="button" disabled={!selected || busy} onClick={submit}>
          {busy ? "Submitting…" : "Submit Answer"}
        </button>
      )}
    </div>
  );
}
