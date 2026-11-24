"use client";

import { useState } from "react";
import RoundSetup from "./RoundSetup";

type Flashcard = {
  question_id: string;
  tool: {
    tool_id: string;
    formal_name: string;
    common_name: string | null;
    use_description: string | null;
    location: string | null;
    family_name: string;
    image_url: string;
    learning_status: string;
  };
};

export default function FlashcardRunner() {
  const [targetCount, setTargetCount] = useState(10);
  const [started, setStarted] = useState(false);
  const [card, setCard] = useState<Flashcard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [number, setNumber] = useState(0);
  const [known, setKnown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  async function loadCard(nextNumber: number) {
    setBusy(true);
    setMessage("");
    setRevealed(false);

    const response = await fetch("/api/flashcards/question", {
      cache: "no-store"
    });
    const body = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(body.error ?? "Could not load flashcard.");
      return;
    }

    setCard(body);
    setNumber(nextNumber);
  }

  async function begin(count: number) {
    setTargetCount(count);
    setStarted(true);
    setComplete(false);
    setKnown(0);
    await loadCard(1);
  }

  async function rate(rating: "KNOWN" | "REVIEW") {
    if (!card) return;

    setBusy(true);
    const response = await fetch("/api/flashcards/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: card.question_id, rating })
    });
    const body = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(body.error ?? "Could not save rating.");
      return;
    }

    if (rating === "KNOWN") setKnown((value) => value + 1);

    if (number >= targetCount) {
      setComplete(true);
      setCard(null);
      return;
    }

    await loadCard(number + 1);
  }

  if (!started) {
    return (
      <RoundSetup
        label="Number of Cards"
        buttonLabel="Begin Flashcards"
        defaultCount={targetCount}
        onBegin={begin}
      />
    );
  }

  if (complete) {
    return (
      <div className="card grid">
        <h2>Flashcard round complete.</h2>
        <p><strong>{known}</strong> of {targetCount} marked “I Knew It”.</p>
        <button className="button" onClick={() => setStarted(false)}>
          Start Another Round
        </button>
      </div>
    );
  }

  if (!card) {
    return <div className="card">{busy ? "Loading flashcard..." : message}</div>;
  }

  const tool = card.tool;

  return (
    <div className="grid flashcard-wrap">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Card {number} of {targetCount}</strong>
        <span>{tool.learning_status}</span>
      </div>
      <div className="progress">
        <div style={{ width: `${(number / targetCount) * 100}%` }} />
      </div>

      <div className="tool-image-card large">
        <img src={tool.image_url} alt="Tool flashcard" />
      </div>

      {!revealed ? (
        <button className="button" onClick={() => setRevealed(true)}>
          Reveal Answer
        </button>
      ) : (
        <>
          <div className="card flashcard-answer">
            <p><strong>Formal name:</strong> {tool.formal_name}</p>
            {tool.common_name && <p><strong>Common name:</strong> {tool.common_name}</p>}
            {tool.use_description && <p><strong>Use:</strong> {tool.use_description}</p>}
            {tool.location && <p><strong>Normally carried/stored:</strong> {tool.location}</p>}
            <p><strong>Family:</strong> {tool.family_name}</p>
          </div>
          {message && <div className="warning">{message}</div>}
          <div className="grid grid-2">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => rate("REVIEW")}
            >
              Review Again
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => rate("KNOWN")}
            >
              I Knew It
            </button>
          </div>
        </>
      )}
    </div>
  );
}
