import { useState, useRef, useEffect, type TouchEvent } from "react";
import { captureWord } from "../use-cases/captureWord";
import type {
  Language,
  Translation,
  TranslationConfig,
} from "../domain/models";
import "./QuickCapture.css";
import { createDeck, getDecks } from "../adapters/supabase";

const LANG_LABELS: Record<Language, string> = {
  french: "Français",
  italian: "Italiano",
  german: "Deutsch",
  english: "English",
};

interface Props {
  onStudyOpen: () => void;
  onProfileOpen: () => void;
  onReadingOpen: () => void;
}

const QuickCapture = ({ onStudyOpen, onProfileOpen, onReadingOpen }: Props) => {
  const [phrase, setPhrase] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "duplicate"
  >("idle");
  const [sourceLanguage, setSourceLanguage] = useState<Language>("french");
  const [targetLanguage, setTargetLanguage] = useState<Language>("german");
  const [results, setResults] = useState<Translation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");

  useEffect(() => {
    getDecks().then((data) => setDecks(data ?? []));
  }, []);

  // Swipe-to-close
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragOffset = useRef(0);

  const targetOptions: Record<Language, Language[]> = {
    german: ["french", "italian", "english"],
    french: ["german"],
    italian: ["german"],
    english: ["german"],
  };

  const phrasePlaceholders: Record<Language, string> = {
    french: "par example: vélo",
    italian: "per esempio: sprezzatura",
    german: "zum Beispiel: Fahrrad",
    english: "for example: bicycle",
  };

  const contextPlaceholders: Record<Language, string> = {
    french: "par example: Je vais au travail à vélo.",
    italian: "per esempio: Vado al lavoro in bicicletta.",
    german: "zum Beispiel: Ich fahre mit dem Fahrrad zur Arbeit.",
    english: "for example: I love to ride my bicycle.",
  };

  const handleCapture = async () => {
    setStatus("loading");
    try {
      const transConfig = {
        sourceLanguage,
        targetLanguage,
      } as TranslationConfig;
      const translation = await captureWord(
        phrase,
        transConfig,
        context,
        selectedDeckId ?? undefined,
      );
      setResults(translation);
      setSheetOpen(true);
      setStatus("success");
      setPhrase("");
      setContext("");
    } catch (e) {
      if (e instanceof Error && e.message === "DUPLICATE") {
        setStatus("duplicate");
      } else {
        setStatus("error");
      }
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    const deck = await createDeck(newDeckName.trim());
    setDecks((prev) => [...prev, deck]);
    setSelectedDeckId(deck.id);
    setNewDeckName("");
    setShowNewDeck(false);
  };

  const closeSheet = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
      sheetRef.current.style.transition = "";
    }
    setSheetOpen(false);
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    dragStart.current = e.touches[0].clientY;
    dragOffset.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const delta = e.touches[0].clientY - dragStart.current;
    if (delta < 0) return;
    dragOffset.current = delta;
    if (sheetRef.current)
      sheetRef.current.style.transform = `translateY(${delta}px)`;
  };

  const onTouchEnd = () => {
    if (sheetRef.current) sheetRef.current.style.transition = "";
    if (dragOffset.current > 120) {
      closeSheet();
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = "";
    }
    dragStart.current = null;
  };

  return (
    <div className="qc-wrapper">
      <div className="qc-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 className="qc-title">Lingua</h1>
          <div style={{ display: "flex", gap: 12 }}>
            {/* <button className="qc-icon-btn" onClick={onReadingOpen}>
              📖
            </button> */}
            <button className="qc-icon-btn" onClick={onStudyOpen}>
              📚
            </button>
            <button className="qc-icon-btn" onClick={onProfileOpen}>
              👤
            </button>
          </div>
        </div>

        <div className="qc-lang-row">
          <select
            className="qc-select"
            value={sourceLanguage}
            onChange={(e) => {
              const newSource = e.target.value as Language;
              setSourceLanguage(newSource);
              setTargetLanguage(targetOptions[newSource][0]);
            }}
          >
            {Object.keys(targetOptions).map((lang) => (
              <option key={lang} value={lang}>
                {LANG_LABELS[lang as Language]}
              </option>
            ))}
          </select>
          <span 
            className="qc-arrow" 
            onClick={
              () => {
                let tempTargetLang = targetLanguage;
                setTargetLanguage(sourceLanguage);
                setSourceLanguage(tempTargetLang);
              }
            }> 
            ⇄ 
          </span>
          <select
            className="qc-select"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value as Language)}
          >
            {targetOptions[sourceLanguage].map((lang) => (
              <option key={lang} value={lang}>
                {LANG_LABELS[lang as Language]}
              </option>
            ))}
          </select>
        </div>

        <div className="qc-divider" />

        <label className="qc-label">Wort oder Phrase</label>
        <input
          className="qc-input"
          type="text"
          value={phrase}
          onChange={(e) => {
            setPhrase(e.target.value);
            setStatus("idle");
          }}
          placeholder={phrasePlaceholders[sourceLanguage]}
        />

        <label className="qc-label">
          Kontext <span className="qc-label-optional">(optional)</span>
        </label>
        <input
          className="qc-input"
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={contextPlaceholders[sourceLanguage]}
        />
        {decks.length > 0 || showNewDeck ? (
          <>
            <label className="qc-label">Deck</label>
            {!showNewDeck ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <select
                  className="qc-select"
                  style={{ flex: 1 }}
                  value={selectedDeckId ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowNewDeck(true);
                    } else {
                      setSelectedDeckId(e.target.value || null);
                    }
                  }}
                >
                  <option value="">Kein Deck</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                  <option value="__new__">+ Neues Deck</option>
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <input
                  className="qc-input"
                  style={{ flex: 1, marginBottom: 0 }}
                  placeholder="Deck-Name..."
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  autoFocus
                />
                <button
                  className="qc-button"
                  style={{ width: "auto", padding: "12px 16px" }}
                  onClick={handleCreateDeck}
                >
                  ✓
                </button>
                <button
                  className="qc-icon-btn"
                  onClick={() => setShowNewDeck(false)}
                >
                  ✕
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <label className="qc-label">Deck</label>
            <button
              className="qc-icon-btn"
              style={{
                alignSelf: "flex-start",
                marginBottom: 20,
                fontSize: 14,
                color: "#8B5E3C",
              }}
              onClick={() => setShowNewDeck(true)}
            >
              + Neues Deck erstellen
            </button>
          </>
        )}
        <button
          className="qc-button"
          onClick={handleCapture}
          disabled={status === "loading" || phrase.length === 0}
        >
          {status === "loading" ? (
            <span className="qc-button-loading">
              <span className="qc-spinner" />
              Wird übersetzt...
            </span>
          ) : (
            "Übersetzen & Speichern"
          )}
        </button>

        {status === "error" && (
          <p className="qc-status error">
            Fehler beim Speichern. Bitte nochmals versuchen.
          </p>
        )}
        {status === "duplicate" && (
          <p className="qc-status duplicate">
            „{phrase}" ist bereits in deiner Sammlung.
          </p>
        )}
      </div>

      {sheetOpen && <div className="qc-backdrop" onClick={closeSheet} />}

      <div
        ref={sheetRef}
        className={`qc-sheet ${sheetOpen ? "qc-sheet--open" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="qc-sheet-handle" onClick={closeSheet} />

        {results && (
          <div className="qc-result">
            {/* Wort + Artikel + Übersetzung */}
            <div className="qc-result-header">
              <div className="qc-result-phrase-row">
                {results.article && (
                  <span className="qc-result-article">
                    {results.article.indefinite}
                  </span>
                )}
                <span className="qc-result-phrase">{results.phrase}</span>
                <span className="qc-result-wordtype">{results.wordType}</span>
              </div>
              <div className="qc-result-phrase-row">
                <p className="qc-result-translation">{results.translation}</p>
              </div>
            </div>

            {/* Beispielsatz */}
            {results.example && (
              <div className="qc-result-block">
                <p className="qc-result-block-label">Beispiel</p>
                <p className="qc-result-example">„{results.example}"</p>
                {results.exampleTranslation && (
                  <p className="qc-result-example-translation">
                    „{results.exampleTranslation}"
                  </p>
                )}
              </div>
            )}

            {/* Grammatik */}
            {results.grammar && (
              <div className="qc-result-block">
                <p className="qc-result-block-label">Grammatik</p>
                <p className="qc-result-grammar">{results.grammar}</p>
              </div>
            )}

            {/* Konjugation */}
            {results.conjugation && (
              <details className="qc-details">
                <summary className="qc-details-summary">Konjugation</summary>
                <div className="qc-details-grid">
                  {Object.entries(results.conjugation).map(
                    ([pronoun, form]) => (
                      <div key={pronoun} className="qc-details-row">
                        <span className="qc-details-label">{pronoun}</span>
                        <span className="qc-details-value">{form}</span>
                      </div>
                    ),
                  )}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickCapture;
