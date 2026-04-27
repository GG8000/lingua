import { translatePhrase } from "../adapters/gemini";
import { cardExists, saveCard } from "../adapters/supabase";
import type { Translation, TranslationConfig } from "../domain/models";

export async function captureWord(
  phrase: string,
  config: TranslationConfig,
  context?: string,
  deckId?: string,
): Promise<Translation> {
  const exists = await cardExists(
    phrase,
    config.sourceLanguage,
    config.targetLanguage,
    deckId,
  );
  if (exists) {
    throw new Error("DUPLICATE");
  }

  const translation = await translatePhrase(phrase, config, context);
  await saveCard(translation, deckId, false);
  await saveCard(translation, deckId, true);

  return translation as Translation;
}
