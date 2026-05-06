// src/reading/ReadingSession.tsx

import { useState } from "react";
import {
  generateReadingText,
  generateQuestions,
  correctAnswer,
} from "../adapters/gemini";
import { captureWord } from "../use-cases/captureWord";
import ClickableText from "../components/ClickableText";
import type {
  CEFRLevel,
  ReadingText,
  ReadingQuestion,
  ReadingCorrection,
  Language,
} from "../domain/models";
import "./ReadingSession.css";

type Screen = "setup" | "reading" | "questions" | "results";

interface Props {
  onClose: () => void;
}

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2"];

const TOPICS = [
  "Alltag in Frankreich",
  "Studium und Uni",
  "Reisen",
  "Essen und Restaurants",
  "Freundschaft",
  "Stadt und Natur",
  "Arbeit",
];

const ReadingSession = ({ onClose }: Props) => {
  const [screen, setScreen] = useState<Screen>("setup");
  const [level, setLevel] = useState<CEFRLevel>("A2");
  const [topic, setTopic] = useState<string>("");
  const [customText, setCustomText] = useState("");
  const [mode, setMode] = useState<"generate" | "upload" | "pdf">("generate");
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfPage, setPdfPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [corrections, setCorrections] = useState<ReadingCorrection[]>([]);
  const [savedWords, setSavedWords] = useState<
    { word: string; translation: string; wordType: string }[]
  >([]);
  const [language, setLanguage] = useState<Language>("french");

  // ── Setup → Reading ──────────────────────────────────────────────────

  const handleStart = async () => {
    setLoading(true);
    try {
      let text: ReadingText;

      if (mode === "generate") {
        text = await generateReadingText(level, language, topic || undefined);
        const qs = await generateQuestions(text.content, level, language);
        setReadingText(text);
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(""));
        setScreen("reading");
      } else if (mode === "pdf") {
        setReadingText({
          content: pdfPages.join("\n\n"),
          level,
          source: "pdf",
        });
        setScreen("reading");
      } else {
        text = { content: customText, level, source: "uploaded" };
        const qs = await generateQuestions(text.content, level, language);
        setReadingText(text);
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(""));
        setScreen("reading");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Reading → Questions ───────────────────────────────────────────────

  const handleStartQuestions = () => {
    setScreen("questions");
  };

  // ── Questions → Results ───────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!readingText) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        questions.map((q, i) =>
          correctAnswer(q.question, answers[i], readingText.content),
        ),
      );
      setCorrections(results);
      setScreen("results");
    } finally {
      setLoading(false);
    }
  };

  // ── Wort speichern ────────────────────────────────────────────────────

  const handleWordSave = (
    word: string,
    translation: string,
    wordType: string,
  ) => {
    setSavedWords((prev) => {
      if (prev.find((w) => w.word === word)) return prev;
      return [...prev, { word, translation, wordType }];
    });
  };

  const handleSaveAllWords = async () => {
    const deckMap: Record<Language, string> = {
      french: "Französisch",
      german: "Deutsch",
      english: "Englisch",
      italian: "Italienisch",
    };

    const deck = deckMap[language] ?? "Französisch";

    for (const w of savedWords) {
      await captureWord(
        w.word,
        {
          sourceLanguage: language.toLowerCase() as any,
          targetLanguage: "german",
        },
        "",
        deck,
      );
    }
  };

  // ── Screens ───────────────────────────────────────────────────────────

  if (screen === "setup") {
    return (
      <div className="reading-wrapper">
        <button className="study-back-btn" onClick={onClose}>
          ← Zurück
        </button>

        <div className="deck-header">
          <h1 className="deck-title">Leseverstehen</h1>
          <p className="deck-subtitle">
            Lies einen Text und beantworte Fragen dazu.
          </p>
        </div>

        {/* Modus */}
        <div className="reading-mode-toggle">
          <button
            className={`reading-mode-btn ${mode === "generate" ? "active" : ""}`}
            onClick={() => setMode("generate")}
          >
            Text generieren
          </button>
          <button
            className={`reading-mode-btn ${mode === "upload" ? "active" : ""}`}
            onClick={() => setMode("upload")}
          >
            Text eingeben
          </button>
          <button
            className={`reading-mode-btn ${mode === "pdf" ? "active" : ""}`}
            onClick={() => setMode("pdf")}
          >
            PDF
          </button>
        </div>

        {mode === "generate" && (
          <>
            <div className="reading-section">
              <label className="qc-label">CEFR Level</label>
              <div className="reading-level-row">
                {CEFR_LEVELS.map((l) => (
                  <button
                    key={l}
                    className={`reading-level-btn ${level === l ? "active" : ""}`}
                    onClick={() => setLevel(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="reading-section">
              <label className="qc-label">
                Thema <span className="qc-label-optional">(optional)</span>
              </label>
              <select
                className="qc-select"
                style={{ width: "100%" }}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="">Zufälliges Thema</option>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {mode == "upload" && (
          <div className="reading-section">
            <label className="qc-label">Französischen Text einfügen</label>
            <textarea
              className="reading-textarea"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Füge hier deinen französischen Text ein..."
              rows={8}
            />
            <div className="reading-section">
              <label className="qc-label">Dein Level</label>
              <div className="reading-level-row">
                {CEFR_LEVELS.map((l) => (
                  <button
                    key={l}
                    className={`reading-level-btn ${level === l ? "active" : ""}`}
                    onClick={() => setLevel(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === "pdf" && (
          <div className="reading-section">
            <label className="qc-label">PDF hochladen</label>
            <div
              className="pdf-dropzone"
              onClick={() => document.getElementById("pdf-input")?.click()}
            >
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLoading(true);
                  try {
                    const { extractTextFromPDF } =
                      await import("../adapters/pdf");
                    const pages = await extractTextFromPDF(file);
                    setPdfPages(pages);
                    setPdfPage(0);
                    console.log(pages);
                  } finally {
                    setLoading(false);
                  }
                }}
              />
              {pdfPages.length > 0 ? (
                <p className="pdf-dropzone-text">
                  ✓ {pdfPages.length} Seiten geladen
                </p>
              ) : (
                <>
                  <p className="pdf-dropzone-icon">📄</p>
                  <p className="pdf-dropzone-text">PDF tippen zum Auswählen</p>
                </>
              )}
            </div>
            <label className="qc-label" style={{ marginTop: 16 }}>
              Sprache des PDFs
            </label>
            <select
              className="qc-select"
              style={{ width: "100%" }}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option>Französisch</option>
              <option>Englisch</option>
              <option>Spanisch</option>
              <option>Italienisch</option>
              <option>Deutsch</option>
            </select>
          </div>
        )}

        <button
          className="qc-button"
          onClick={handleStart}
          disabled={
            loading || (mode === "upload" && customText.trim().length < 10)
          }
        >
          {loading ? (
            <span className="qc-button-loading">
              <span className="qc-spinner" />
              Text wird vorbereitet...
            </span>
          ) : (
            "Starten"
          )}
        </button>
      </div>
    );
  }

  if (screen === "reading") {
    return (
      <div className="reading-wrapper">
        <div className="reading-topbar">
          <button className="study-back-btn" onClick={() => setScreen("setup")}>
            ← Zurück
          </button>
          <span className="reading-level-badge">{readingText?.level}</span>
        </div>

        <div className="reading-card">
          <p className="reading-hint">
            Tippe auf ein Wort um es zu übersetzen.
          </p>

          {mode === "pdf" && pdfPages.length > 1 && (
            <div className="pdf-pagination">
              <button
                disabled={pdfPage === 0}
                onClick={() => setPdfPage((p) => p - 1)}
              >
                ←
              </button>
              <span>
                Seite {pdfPage + 1} von {pdfPages.length}
              </span>
              <button
                disabled={pdfPage === pdfPages.length - 1}
                onClick={() => setPdfPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          )}

          <ClickableText
            text={
              mode === "pdf"
                ? (pdfPages[pdfPage] ?? "")
                : (readingText?.content ?? "")
            }
            onWordSave={handleWordSave}
          />
        </div>

        {savedWords.length > 0 && (
          <div className="reading-saved-words">
            <p className="qc-label">Nachgeschlagen ({savedWords.length})</p>
            <div className="reading-saved-list">
              {savedWords.map((w) => (
                <span key={w.word} className="reading-saved-chip">
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {mode === "pdf" ? (
          <button className="qc-button" onClick={() => setScreen("results")}>
            Wörter überprüfen →
          </button>
        ) : (
          <button className="qc-button" onClick={handleStartQuestions}>
            Zu den Fragen →
          </button>
        )}
      </div>
    );
  }

  if (screen === "questions") {
    return (
      <div className="reading-wrapper">
        <div className="reading-topbar">
          <button
            className="study-back-btn"
            onClick={() => setScreen("reading")}
          >
            ← Text
          </button>
          <span className="reading-level-badge">{readingText?.level}</span>
        </div>

        <div className="deck-header">
          <h1 className="deck-title">Fragen</h1>
          <p className="deck-subtitle">
            Beantworte die Fragen auf Französisch.
          </p>
        </div>

        <div className="reading-questions">
          {questions.map((q, i) => (
            <div key={i} className="reading-question-card">
              <p className="reading-question-text">{q.question}</p>
              <textarea
                className="reading-textarea"
                value={answers[i]}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                placeholder="Deine Antwort auf Französisch..."
                rows={3}
              />
            </div>
          ))}
        </div>

        <button
          className="qc-button"
          onClick={handleSubmit}
          disabled={loading || answers.some((a) => a.trim().length === 0)}
        >
          {loading ? (
            <span className="qc-button-loading">
              <span className="qc-spinner" />
              Wird korrigiert...
            </span>
          ) : (
            "Korrigieren lassen"
          )}
        </button>
      </div>
    );
  }

  if (screen === "results") {
    return (
      <div className="reading-wrapper">
        <button className="study-back-btn" onClick={() => setScreen("setup")}>
          ← Neue Aufgabe
        </button>

        <div className="deck-header">
          <h1 className="deck-title">Ergebnisse</h1>
        </div>

        <div className="reading-questions">
          {corrections.map((c, i) => (
            <div key={i} className="reading-result-card">
              <p className="reading-question-text">{questions[i].question}</p>
              <div className={`reading-result-grade grade-${c.grade}`}>
                {c.grade === "correct"
                  ? "✓ Richtig"
                  : c.grade === "partial"
                    ? "~ Teilweise richtig"
                    : "✗ Falsch"}
              </div>
              {c.corrected !== c.original && (
                <div className="reading-result-correction">
                  <p className="qc-label">Korrektur</p>
                  <p className="reading-corrected">{c.corrected}</p>
                </div>
              )}
              <p className="reading-explanation">{c.explanation}</p>
            </div>
          ))}
        </div>

        {savedWords.length > 0 && (
          <div className="reading-vocab-section">
            <p className="qc-label">
              Nachgeschlagene Wörter ({savedWords.length})
            </p>
            <div className="reading-vocab-list">
              {savedWords.map((w) => (
                <div key={w.word} className="reading-vocab-item">
                  <span className="reading-vocab-word">{w.word}</span>
                  <span className="reading-vocab-translation">
                    {w.translation}
                  </span>
                </div>
              ))}
            </div>
            <button className="qc-button" onClick={handleSaveAllWords}>
              Alle als Karten speichern
            </button>
          </div>
        )}

        <button className="profile-logout" onClick={() => setScreen("setup")}>
          Neue Aufgabe starten
        </button>
      </div>
    );
  }

  return null;
};

export default ReadingSession;
