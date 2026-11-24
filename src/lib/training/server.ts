import { getUserContext } from "@/lib/auth";
import {
  classifyLearningStatus,
  selectionWeight
} from "@/lib/training/rules";
import { sampleWithoutReplacement, weightedPick } from "@/lib/training/random";
import { publicToolImageUrl } from "@/lib/storage";

export type ToolRow = {
  id: string;
  formal_name: string;
  common_name: string | null;
  use_description: string | null;
  family_id: string | null;
  location: string | null;
  image_path: string | null;
  tool_families: { name: string } | null;
};

export type ScenarioRow = {
  id: string;
  name: string;
  description: string;
};

export async function authenticatedContext() {
  const context = await getUserContext();
  if (!context) throw new Error("UNAUTHORIZED");
  return context;
}

export async function loadPublishedTools(requireImages = false) {
  const { supabase } = await authenticatedContext();

  let query = supabase
    .from("tools")
    .select(
      "id, formal_name, common_name, use_description, family_id, location, image_path, tool_families(name)"
    )
    .eq("status", "published")
    .order("formal_name");

  if (requireImages) {
    query = query.not("image_path", "is", null);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as unknown as ToolRow[];
}

export async function loadUserAttemptStats(userId: string) {
  const { supabase } = await authenticatedContext();
  const { data, error } = await supabase
    .from("attempts")
    .select("tool_id, is_correct, attempted_at")
    .eq("user_id", userId)
    .order("attempted_at", { ascending: true });

  if (error) throw error;

  const stats = new Map<
    string,
    { attempts: number; correct: number; latestCorrect: boolean }
  >();

  for (const row of data ?? []) {
    const current = stats.get(row.tool_id) ?? {
      attempts: 0,
      correct: 0,
      latestCorrect: false
    };

    current.attempts += 1;
    current.correct += row.is_correct ? 1 : 0;
    current.latestCorrect = row.is_correct;
    stats.set(row.tool_id, current);
  }

  return stats;
}

export async function chooseAdaptiveTool(tools: ToolRow[], userId: string) {
  if (!tools.length) throw new Error("NO_ELIGIBLE_TOOLS");

  const stats = await loadUserAttemptStats(userId);

  const weighted = tools.map((tool) => {
    const current = stats.get(tool.id) ?? {
      attempts: 0,
      correct: 0,
      latestCorrect: false
    };

    const accuracy = current.attempts
      ? current.correct / current.attempts
      : 0;

    const status = classifyLearningStatus({
      attempts: current.attempts,
      accuracy,
      mostRecentCorrect: current.latestCorrect
    });

    return {
      tool,
      status,
      weight: selectionWeight(status)
    };
  });

  return weightedPick(weighted, (item) => item.weight);
}

export function cleanValue(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function shuffle<T>(items: T[]) {
  return sampleWithoutReplacement(items, items.length);
}

export function sameFamilyFirstTextDistractors(input: {
  tools: ToolRow[];
  correctTool: ToolRow;
  getAnswer: (tool: ToolRow) => string | null;
  excludedToolIds?: Set<string>;
}) {
  const { tools, correctTool, getAnswer } = input;
  const excludedToolIds = new Set(input.excludedToolIds ?? []);
  excludedToolIds.add(correctTool.id);

  const correctAnswer = cleanValue(getAnswer(correctTool));
  if (!correctAnswer) return [];

  const candidateMap = new Map<string, ToolRow>();

  for (const tool of tools) {
    if (excludedToolIds.has(tool.id)) continue;
    const answer = cleanValue(getAnswer(tool));
    if (!answer || answer === correctAnswer) continue;
    if (!candidateMap.has(answer)) candidateMap.set(answer, tool);
  }

  const candidates = [...candidateMap.entries()].map(([answer, tool]) => ({
    answer,
    tool
  }));

  const sameFamily = shuffle(
    candidates.filter(({ tool }) => tool.family_id === correctTool.family_id)
  );
  const otherFamilies = shuffle(
    candidates.filter(({ tool }) => tool.family_id !== correctTool.family_id)
  );

  const selected = sameFamily.slice(0, 3);
  if (selected.length < 3) {
    selected.push(...otherFamilies.slice(0, 3 - selected.length));
  }

  return selected.map((item) => item.answer).slice(0, 3);
}

export function sameFamilyFirstAttributeDistractors(input: {
  tools: ToolRow[];
  correctTool: ToolRow;
  getAnswer: (tool: ToolRow) => string | null;
}) {
  const { tools, correctTool, getAnswer } = input;
  const correctAnswer = cleanValue(getAnswer(correctTool));
  if (!correctAnswer) return [];

  const same = new Set<string>();
  const other = new Set<string>();

  for (const tool of tools) {
    if (tool.id === correctTool.id) continue;
    const answer = cleanValue(getAnswer(tool));
    if (!answer || answer === correctAnswer) continue;

    if (tool.family_id === correctTool.family_id) same.add(answer);
    else other.add(answer);
  }

  const sameValues = shuffle([...same]);
  const otherValues = shuffle([...other]);
  const selected = sameValues.slice(0, 3);

  if (selected.length < 3) {
    selected.push(
      ...otherValues.filter((value) => !selected.includes(value)).slice(0, 3 - selected.length)
    );
  }

  return selected.slice(0, 3);
}

export function imageUrl(imagePath: string | null) {
  return publicToolImageUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    imagePath
  );
}

export async function createQuestionState(input: {
  userId: string;
  mode: string;
  questionType: string;
  correctToolId: string;
  correctAnswer?: string | null;
  optionValues?: string[] | null;
  optionToolIds?: string[] | null;
  scenarioId?: string | null;
}) {
  const { supabase } = await authenticatedContext();
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert({
      user_id: input.userId,
      mode: input.mode,
      question_type: input.questionType,
      correct_tool_id: input.correctToolId,
      correct_answer: input.correctAnswer ?? null,
      option_values: input.optionValues ?? null,
      option_tool_ids: input.optionToolIds ?? null,
      scenario_id: input.scenarioId ?? null
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Could not create question.");
  return data.id as string;
}

export async function loadPublishedScenarios() {
  const { supabase } = await authenticatedContext();
  const { data, error } = await supabase
    .from("scenarios")
    .select("id, name, description")
    .eq("status", "published");

  if (error) throw error;
  return (data ?? []) as ScenarioRow[];
}

export async function loadScenarioLinks() {
  const { supabase } = await authenticatedContext();
  const { data, error } = await supabase
    .from("scenario_tools")
    .select("scenario_id, tool_id, is_correct");

  if (error) throw error;
  return data ?? [];
}
