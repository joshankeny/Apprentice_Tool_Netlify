"use client";

import { useState } from "react";

type Question = {
  question_id: string;
  question_type: string;
  prompt: string;
  options: string[];
  image_url?: string | null;
  scenario_name?: string | null;
  scenario_description?: string | null;
  use_description?: string | null;
  learning_status?: string | null;
};

type Result = {
  correct: boolean;
  correct_answer: string;
};

export default function ChoiceQuizRunner({
  questionEndpoint,
  defaultCount = 10
}: {
  questionEndpoint: string;
  defaultCount?: number;
}) {
  const [targetCount, setTargetCount] = useState(defaultCount);
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [number, setNumber] = useState(0);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  async function loadQuestion(nextNumber: number) {
    setBusy(true);
    setMessage("");
    setSelected(null);
    setResult(null);

    const response = await fetch(questionEndpoint, { cache: "no-store" });
    const body = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(body.error ?? "Could not load question.");
      return;
    }

    setQuestion(body);
    setNumber(nextNumber);
  }

  async function begin() {
    setStarted(true);
    setComplete(false);
    setScore(0);
    await loadQuestion(1);
  }

  async function submit() {
    if (!question || !selected || result) return;

    setBusy(true);
    setMessage("");

    const response = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: question.question_id,
        selected_answer: selected
      })
    });

    const body = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(body.error ?? "Could not submit answer.");
      return;
    }

    setResult(body);
    if (body.correct) setScore((current) => current + 1);
  }

  async function nextQuestion() {
    if (number >= targetCount) {
      setComplete(true);
      setQuestion(null);
      return;
    }

    await loadQuestion(number + 1);
  }

  if (!started) {
    return (
      <div className="card grid" style={{ maxWidth: 520 }}>
        <label>
          Number of Questions
          <input
            type="number"
            min={1}
            max={50}
            value={targetCount}
            onChange={(event) =>
              setTargetCount(Math.max(1, Number(event.target.value) || 1))
            }
          />
        </label>
        <button className="button" onClick={begin}>
          Begin Quiz
        </button>
      </div>
    );
  }

  if (complete) {
    const percentage = targetCount
      ? Math.round((score / targetCount) * 100)
      : 0;

    return (
      <div className="card grid">
        <h2>Quiz complete!</h2>
        <div className="grid grid-4">
          <div>
            <div className="muted">Questions</div>
            <div className="metric">{targetCount}</div>
          </div>
          <div>
            <div className="muted">Correct</div>
            <div className="metric">{score}</div>
          </div>
          <div>
            <div className="muted">Score</div>
            <div className="metric">{percentage}%</div>
          </div>
        </div>
        <button
          className="button"
          onClick={() => {
            setStarted(false);
            setComplete(false);
          }}
        >
          Start Another Round
        </button>
      </div>
    );
  }

  if (!question) {
    return <div className="card">{busy ? "Loading question..." : message}</div>;
  }

  return (
    <div className="grid">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <strong>Question {number} of {targetCount}</strong>
        <span>Score: {score}</span>
      </div>

      <div className="progress">
        <div style={{ width: `${(number / targetCount) * 100}%` }} />
      </div>

      {question.learning_status && (
        <div className="muted">Adaptive status: {question.learning_status}</div>
      )}

      <h2>{question.prompt}</h2>

      <div className="quiz-layout">
        <div>
          {question.image_url ? (
            <div className="tool-image-card">
              <img src={question.image_url} alt="Tool to identify" />
            </div>
          ) : (
            <div className="card scenario-card">
              {question.scenario_name && <h3>{question.scenario_name}</h3>}
              {question.scenario_description && (
                <p>{question.scenario_description}</p>
              )}
            </div>
          )}
        </div>

        <div className="grid">
          {question.options.map((option) => {
            let className = "choice-button";
            let mark = "";

            if (!result && selected === option) className += " selected";
            if (result && option === result.correct_answer) {
              className += " correct";
              mark = "✓";
            } else if (result && selected === option && !result.correct) {
              className += " wrong";
              mark = "✕";
            }

            return (
              <button
                key={option}
                type="button"
                disabled={Boolean(result)}
                className={className}
                onClick={() => setSelected(option)}
              >
                <span>{option}</span>
                {mark && <strong>{mark}</strong>}
              </button>
            );
          })}

          {message && <div className="warning">{message}</div>}

          {!result ? (
            <button
              className="button"
              disabled={!selected || busy}
              onClick={submit}
            >
              {busy ? "Submitting..." : "Submit Answer"}
            </button>
          ) : (
            <>
              {question.use_description && (
                <p className="muted">Use: {question.use_description}</p>
              )}
              <button className="button" onClick={nextQuestion}>
                {number >= targetCount ? "Finish Quiz" : "Next Question"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
