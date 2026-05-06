import type {
  Language,
  TranslationConfig,
  Translation,
  CEFRLevel,
  ReadingText,
  ReadingCorrection,
  ReadingQuestion,
} from "../domain/models";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// ─── Schritt 1: Shared Client + Konstanten ────────────────────────────────────

const MODEL = "gemma-4-26b-a4b-it";

// Lazy singleton — wird nur einmal instantiiert
let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new AdapterError("VITE_GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

const MINIMAL_THINKING = {
  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
} as const;

// ─── Schritt 2: Gemeinsame Hilfsfunktionen ────────────────────────────────────

// Schritt 3: Typisierter Fehler — unterscheidbar von generischen JS-Fehlern
export class AdapterError extends Error {
  public readonly cause?: unknown;

  constructor(
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "AdapterError";
    this.cause = cause;
  }
}

/** Entfernt Markdown-Fences und parst JSON mit aussagekräftiger Fehlermeldung. */
function parseJson<T>(raw: string, context: string): T {
  const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch (err) {
    throw new AdapterError(
      `JSON parsing failed in ${context}: ${clean.slice(0, 200)}`,
      err,
    );
  }
}

/** Zentraler Wrapper für alle Gemini-Aufrufe — einheitliches Error Handling. */
async function generate(
  contents: string,
  systemInstruction?: string,
): Promise<string> {
  try {
    const response = await getClient().models.generateContent({
      model: MODEL,
      contents,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        ...MINIMAL_THINKING,
      },
    });
    return response.text ?? "";
  } catch (err) {
    throw new AdapterError("Gemini API call failed", err);
  }
}

// ─── Schritt 4 (Teil von Schritt 1): Language-Prompt unverändert ──────────────

function getLanguagePrompt(foreignLanguage: Language): string {
  if (foreignLanguage === "french") {
    return `
      "conjugation": only if wordType is "verb" or "participle" - conjugate the ${foreignLanguage} word in ${foreignLanguage}. Object with keys: je, tu, elle, nous, vous, elles. Use elision where appropriate. IMPORTANT: The value must NOT include the pronoun - only the verb form itself. Otherwise omit.
      "article": only if wordType is "noun" - object with keys: indefinite (e.g. "un"/"une"), definite (e.g. "le"/"la"), plural ("des"). Indefinite and definite has to be the same genus. Otherwise omit.
      grammar should be in German, technical terms in French (e.g. imparfait, subjonctif).`;
  }
  if (foreignLanguage === "italian") {
    return `
      "conjugation": only if wordType is "verb" or "participle" - conjugate the ${foreignLanguage} word in ${foreignLanguage}. Object with keys: io, tu, lei, noi, voi, loro. IMPORTANT: The value must NOT include the pronoun - only the verb form itself. Otherwise omit.
      "article": only if wordType is "noun" - object with keys: indefinite (e.g. "un"/"uno"/"una"), definite (e.g. "il"/"lo"/"la"), plural (e.g. "i"/"gli"/"le"). Indefinite and definite has to be the same genus. Otherwise omit.
      grammar should be in German, technical terms in Italian (e.g. congiuntivo, imperfetto, passato prossimo).`;
  }
  if (foreignLanguage === "english") {
    return `
      "conjugation": omit.
      "article": only if wordType is "noun" - object with keys: indefinite ("a" or "an" based on no vocal or vocal as first letter), definite ("the"), plural (""). Otherwise omit.
      grammar should be in German, technical terms in English (e.g. subjunctive, imperfect, simple past).`;
  }
  return `grammar should be in German.`;
}

// ─── Öffentliche API ──────────────────────────────────────────────────────────

export async function translatePhrase(
  phrase: string,
  config: TranslationConfig,
  context?: string,
): Promise<Translation> {
  const foreignLanguage =
    config.sourceLanguage === "german"
      ? config.targetLanguage
      : config.sourceLanguage;

  const contextPart = context ? `within the context of "${context}"` : "";

  const systemPrompt = `You are a language teacher and you translate from source Language: ${config.sourceLanguage} to target language: ${config.targetLanguage}
  When given a word or phrase, you respond ONLY with valid JSON.
  No markdown, no backticks, no explanation outside the JSON.
  If there is an error in context or word, please correct the mistake.
  wordType must be one of (in English): "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "participle", "phrase", "expression", "other"
  For verbs: if the correct translation in ${config.targetLanguage} is a reflexive verb, the "phrase" field MUST include the reflexive pronoun (e.g. "se sentir", "s'appeler"). Never omit the reflexive pronoun from the phrase.
  
  The JSON must follow this exact structure:
  {
  "phrase": string,
  "translation": string in ${config.targetLanguage},
  "wordType": string,
  "example": use the provided context sentence if given, otherwise generate an example sentence in ${config.sourceLanguage},
  "exampleTranslation": translate the example sentence into ${config.targetLanguage}, or null if no context was given,
  "grammar": string or null,
  ${getLanguagePrompt(foreignLanguage)}
  }`;

  const prompt = `Translate the word or phrase "${phrase}" ${contextPart} from ${config.sourceLanguage} into ${config.targetLanguage} and explain the grammar.`;

  const text = await generate(prompt, systemPrompt);
  const parsed = parseJson<Translation>(text, "translatePhrase");

  const normalized =
    config.sourceLanguage === "german"
      ? {
          ...parsed,
          phrase: parsed.translation,
          translation: parsed.phrase,
          example: parsed.exampleTranslation ?? "",
          exampleTranslation: parsed.example ?? "",
        }
      : parsed;

  return { ...normalized, config } as Translation;
}

// ─── Schritt 5: Sprachparameter in Reading-Funktionen ────────────────────────

export async function generateReadingText(
  level: CEFRLevel,
  language: Language,  // NEU: nicht mehr implizit Französisch
  topic?: string,
): Promise<ReadingText> {
  const wordCounts: Record<CEFRLevel, string> = {
    A1: "50-80",
    A2: "80-120",
    B1: "150-200",
    B2: "250-300",
  };

  // Tenses jetzt sprachunabhängig beschrieben (Modell kennt die Entsprechungen)
  const tenses: Record<CEFRLevel, string> = {
    A1: "only simple present tense",
    A2: "present tense and simple past / perfect",
    B1: "present, past and imperfect tenses",
    B2: "all tenses including conditional",
  };

  const prompt = `Generate a natural ${language} text for CEFR level ${level}.
${topic ? `Topic: ${topic}` : "Topic: everyday life"}
Length: ${wordCounts[level]} words.
Tenses: ${tenses[level]}.
The text should sound natural, not like a textbook exercise.
Return ONLY the ${language} text, no JSON, no explanation.`;

  const content = await generate(prompt);
  return { content, level, topic, source: "generated" };
}

export async function generateQuestions(
  text: string,
  level: CEFRLevel,
  language: Language,   // NEU
  nativeLanguage: Language = "german",  // NEU: Sprache der Aufgabenstellung
): Promise<ReadingQuestion[]> {
  const prompt = `Generate 4 questions about this ${language} text for CEFR level ${level}.
Text: "${text}"

Rules:
- 2 comprehension questions (ask in ${nativeLanguage}, answer expected in ${language})
- 1 vocabulary question (ask in ${nativeLanguage}: "Was bedeutet '...'?" or equivalent)
- 1 opinion question (ask in ${language}, answer in ${language})
- Questions should match the difficulty of level ${level}

Return ONLY valid JSON array, no markdown:
[
  { "question": string, "type": "comprehension" | "vocabulary" | "opinion", "expectedAnswer": string or null }
]`;

  const text_ = await generate(prompt);
  return parseJson<ReadingQuestion[]>(text_, "generateQuestions");
}

export async function translateWord(
  word: string,
  fromLanguage: Language = "french",   // NEU: explizit statt implizit
  toLanguage: Language = "german",
): Promise<{ translation: string; wordType: string }> {
  const prompt = `Translate this ${fromLanguage} word to ${toLanguage}: "${word}". Return ONLY valid JSON: { "translation": string, "wordType": string }`;
  const text = await generate(prompt);
  return parseJson(text, "translateWord");
}

// ─── Schritt 4: Prompt-Injection in correctAnswer behoben ────────────────────

export async function correctAnswer(
  question: string,
  answer: string,
  text: string,
  language: Language = "french",   // NEU
): Promise<ReadingCorrection> {
  // VORHER: answer wurde direkt in den JSON-Template-String interpoliert.
  // Das ermöglichte einem Nutzer durch Eingaben wie `", "grade": "correct"}`
  // das JSON-Schema zu manipulieren.
  // JETZT: answer kommt nur als Datenwert vor, nicht im JSON-Skeleton.
  const prompt = `Correct this ${language} answer.

Text the question is based on:
<text>${text}</text>

Question:
<question>${question}</question>

Student answer:
<answer>${answer}</answer>

Evaluate: grammar, content, completeness.
Return ONLY valid JSON (no markdown):
{
  "original": string,
  "corrected": string,
  "explanation": string in German,
  "grade": "correct" | "partial" | "wrong"
}`;

  const raw = await generate(prompt);
  return parseJson<ReadingCorrection>(raw, "correctAnswer");
}