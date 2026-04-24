import { supabase } from "../adapters/supabase"


export interface ReviewResult {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: Date;
}

export function calculateSM2(
  rating: 1 | 2 | 3 | 4,
  currentInterval: number,
  currentEaseFactor: number,
  currentRepetitions: number,
): ReviewResult {
  let newInterval = currentInterval;
  let newEaseFactor = currentEaseFactor;
  let newRepetitions = currentRepetitions;
  // 1. New interval
  if (currentRepetitions == 0) {
    newInterval = 1;
  } else if (currentRepetitions == 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(currentInterval * currentEaseFactor);
  }
  // 2. New ease_factor
  newEaseFactor = Math.max(
    1.3,
    currentEaseFactor + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02)),
  );

  // 3. repetitions
  if (rating >= 3) newRepetitions = currentRepetitions + 1;
  else {
    newRepetitions = 0;
    newInterval = 1;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);
  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    dueDate: dueDate,
  } as ReviewResult;
}

export async function reviewCard(
  cardId: string,
  rating: 1 | 2 | 3 | 4,
  currentInterval: number,
  currentEaseFactor: number,
  currentRepetitions: number,
): Promise<void> {

  const result = calculateSM2(rating, currentInterval, currentEaseFactor, currentRepetitions)

  const { error } = await supabase
    .from("cards")
    .update({
      interval:     result.interval,
      ease_factor:  result.easeFactor,
      repetitions:  result.repetitions,
      due_date:     result.dueDate.toISOString(),
    })
    .eq("id", cardId)

  if (error) throw new Error(error.message)
}
