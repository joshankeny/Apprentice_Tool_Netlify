export type LearningStatus = "Needs Review" | "New" | "Learning" | "Mastered";

export const XP = {
  FLASHCARD_KNOWN: 10,
  QUIZ_CORRECT: 20,
  SCENARIO_CORRECT: 30,
  MASTERY_BONUS: 100,
  PER_LEVEL: 500
} as const;

export const MASTERY = { MIN_ATTEMPTS: 3, MIN_ACCURACY: 0.8, REQUIRE_LATEST_CORRECT: true } as const;

export const ADAPTIVE_WEIGHTS: Record<LearningStatus, number> = {
  "Needs Review": 4,
  New: 3,
  Learning: 2,
  Mastered: 1
};

export const COMMONLY_MISSED_MULTIPLIER = 1.25;

export function classifyLearningStatus(input: { attempts: number; accuracy: number; mostRecentCorrect: boolean; }): LearningStatus {
  const { attempts, accuracy, mostRecentCorrect } = input;
  const mastered = attempts >= MASTERY.MIN_ATTEMPTS && accuracy >= MASTERY.MIN_ACCURACY && mostRecentCorrect;
  if (mastered) return "Mastered";
  const needsReview = attempts > 0 && (accuracy < 0.7 || !mostRecentCorrect);
  if (needsReview) return "Needs Review";
  if (attempts === 0) return "New";
  return "Learning";
}

export function selectionWeight(status: LearningStatus, commonlyMissed: boolean) {
  const base = ADAPTIVE_WEIGHTS[status];
  return commonlyMissed ? base * COMMONLY_MISSED_MULTIPLIER : base;
}

export function getLevelProgress(xp: number) {
  const level = Math.floor(xp / XP.PER_LEVEL) + 1;
  const xpIntoLevel = xp - (level - 1) * XP.PER_LEVEL;
  return { level, xp, xpIntoLevel, xpNeeded: XP.PER_LEVEL, progress: xpIntoLevel / XP.PER_LEVEL };
}
