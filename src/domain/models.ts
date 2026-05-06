export type WordType =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "participle"
  | "phrase"
  | "expression"
  | "other";

export type Language = "french" | "german" | "italian" | "english"

export interface TranslationConfig {
  sourceLanguage : Language;
  targetLanguage : Language;
}

export interface Translation {
  phrase: string;
  translation: string;
  wordType: WordType;
  example: string;
  exampleTranslation?: string;
  grammar?: string;
  conjugation?: Conjugation;
  article?: Article;
  config: TranslationConfig;
}

export interface Card extends Translation {
  id: string;
  createdAt: Date;
  context?: string;
  tags: string[];
  syncedToAnki: boolean;
}

export interface Conjugation {
  [pronoun: string]: string
}

export interface Article {
  indefinite: string;
  definite: string;
  plural: string;
}

export type CEFRLevel = "A1" | "A2" | "B1" | "B2"

export interface ReadingText {
  content: string
  level: CEFRLevel
  topic?: string
  source: "generated" | "uploaded" | "pdf"
}

export interface ReadingQuestion {
  question: string
  type: "comprehension" | "vocabulary" | "opinion"
  expectedAnswer?: string
}

export interface ReadingCorrection {
  original: string
  corrected: string
  explanation: string
  grade: "correct" | "partial" | "wrong"
}