import type { Language, TranslationConfig, Translation } from "../domain/models";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";


function getLanguagePrompt(foreignLanguage : Language): string {
    if (foreignLanguage === "french") {
        return `
        "conjugation": only if wordType is "verb" or "participle" - conjugate the ${foreignLanguage} word in ${foreignLanguage}. Object with keys: je, tu, elle, nous, vous, elles. Use elision where appropriate. IMPORTANT: The value must NOT include the pronoun - only the verb form itself. Otherwise omit.
        "article": only if wordType is "noun" - object with keys: indefinite (e.g. "un"/"une"), definite (e.g. "le"/"la"), plural ("des"). Indefinite and definite has to be the same genus. Otherwise omit.
        grammar should be in German, technical terms in French (e.g. imparfait, subjonctif).`
    }
    if (foreignLanguage === "italian") {
    return `
        "conjugation": only if wordType is "verb" or "participle" - conjugate the ${foreignLanguage} word in ${foreignLanguage}. Object with keys: io, tu, lei, noi, voi, loro. IMPORTANT: The value must NOT include the pronoun - only the verb form itself. Otherwise omit.
        "article": only if wordType is "noun" - object with keys: indefinite (e.g. "un"/"uno"/"una"), definite (e.g. "il"/"lo"/"la"), plural (e.g. "i"/"gli"/"le"). Indefinite and definite has to be the same genus. Otherwise omit.
        grammar should be in German, technical terms in Italian (e.g. congiuntivo, imperfetto, passato prossimo).`
        }
    if (foreignLanguage === "english") {
        return `
        "conjugation": omit.
        "article": only if wordType is "noun" - object with keys: indefinite ("a" or "an" based on no vocal or vocal as first letter), definite ("the"), plural (""). Otherwise omit.
        grammar should be in German, technical terms in English (e.g. subjunctive, imperfect, simple past).`
    }

  return `grammar should be in German.`
}

export async function translatePhrase(
  phrase: string,
  config: TranslationConfig,
  context?: string,
): Promise<Translation> {
    const foreignLanguage = config.sourceLanguage === "german" 
    ? config.targetLanguage 
    : config.sourceLanguage

    const ai = new GoogleGenAI({apiKey : import.meta.env.VITE_GEMINI_API_KEY});
    
    const contextPart = context 
    ? `within the context of "${context}"` 
    : ""

    const systemPrompt = `You are a language teacher and you translate from source Language: ${config.sourceLanguage} to target language: ${config.targetLanguage}
    When given a word or phrase, you respond ONLY with valid JSON.
    No markdown, no backticks, no explanation outside the JSON.
    If there is an error in context or word, please correct the mistake.
    wordType must be one of (in English): "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "participle", "phrase", "expression", "other"

    The JSON must follow this exact structure:
    {
    "phrase": string,
    "translation": string in ${config.targetLanguage},
    "wordType": string,
    "example": use the provided context sentence if given, otherwise generate an example sentence in ${config.sourceLanguage},
    "exampleTranslation": translate the example sentence into ${config.targetLanguage}, or null if no context was given,
    "grammar": string or null,
    ${getLanguagePrompt(foreignLanguage)}
    }`

    const prompt = `Translate the word or phrase "${phrase}" ${contextPart} from ${config.sourceLanguage} into ${config.targetLanguage} and explain the grammar.`

    
    const response = await ai.models.generateContent({
        model: "gemma-4-26b-a4b-it",
        contents: prompt,
        config: {
            systemInstruction: systemPrompt,
            thinkingConfig: {
                thinkingLevel: ThinkingLevel.MINIMAL,
            }
        }
    });
    
    const text = response.text ?? ""

    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim()

    const parsed = JSON.parse(clean)

    const normalized = config.sourceLanguage === "german"
    ? { ...parsed, phrase: parsed.translation, translation: parsed.phrase, example: parsed.exampleTranslation, exampleTranslation: parsed.example}
    : parsed

  return {
    ...normalized,
    config
    }
}



