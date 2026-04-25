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
