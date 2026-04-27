import { createClient } from "@supabase/supabase-js";
import type { Language, Translation } from "../domain/models";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export async function saveCard(
  translation: Translation,
  deckId?: string,
  reversed: boolean = false,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("cards").insert({
    phrase: translation.phrase,
    translation: translation.translation,
    word_type: translation.wordType,
    example: translation.example,
    example_translation: translation.exampleTranslation,
    grammar: translation.grammar,
    conjugation: translation.conjugation,
    article: translation.article,
    source_language: translation.config.sourceLanguage,
    target_language: translation.config.targetLanguage,
    user_id: user?.id,
    deck_id: deckId ?? null,
    due_date: new Date().toISOString(),
    state: "new",
    step_index: 0,
    reversed: reversed,
  });

  if (error) throw new Error(`Failed to save card: ${error.message}`);
}

export async function cardExists(
  phrase: string,
  sourceLanguage: Language,
  targetLanguage: Language,
  deckId?: string
): Promise<boolean> {
  let query = supabase
    .from("cards")
    .select("id")
    .or(`phrase.ilike.${phrase.trim()},translation.ilike.${phrase.trim()}`)
    .eq("source_language", sourceLanguage)
    .eq("target_language", targetLanguage)
    .eq("reversed", false)
  
  if(deckId) {
    query = query.eq("deck_id", deckId);
  }

  const {data} = await query.limit(1);

  return (data?.length ?? 0) > 0;
}

export async function getProfile() {
  const { data } = await supabase
    .from("profiles")
    .select("native_language")
    .single();

  return data;
}

export async function getDecks() {
  const { data: decks, error } = await supabase
    .from("decks")
    .select("id, name")
    .order("name");

  if (error || !decks) return [];

  const now = new Date().toISOString();

  const enriched = await Promise.all(
    decks.map(async (deck) => {
      const [{ count: total }, { count: due }] = await Promise.all([
        supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deck.id),
        supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deck.id)
          .lte("due_date", now),
      ]);

      return {
        ...deck,
        total_count: total ?? 0,
        due_count: due ?? 0,
      };
    }),
  );

  return enriched;
}

export async function updateProfile(nativeLanguage: Language) {
  const { error } = await supabase
    .from("profiles")
    .update({ native_language: nativeLanguage })
    .eq("id", (await supabase.auth.getUser()).data.user?.id);

  if (error) throw new Error(error.message);
}

export async function getDueCards(deckId?: string) {
  const now = new Date().toISOString();

  let query = supabase
    .from("cards")
    .select("*")
    .lte("due_date", now)
    .order("due_date");

  if (deckId) {
    query = query.eq("deck_id", deckId);
  } else {
    // Karten ohne Deck-Zuweisung (bestehende Karten)
    query = query.is("deck_id", null);
  }

  const { data, error } = await query;
  if (error) return [];
  return data;
}

export async function createDeck(name: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("decks")
    .insert({ name, user_id: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function assignCardToDeck(cardId: string, deckId: string | null) {
  const { error } = await supabase
    .from("cards")
    .update({ deck_id: deckId })
    .eq("id", cardId);

  if (error) throw error;
}
