import { useEffect, useState } from "react";
import { reviewCard } from "../use-cases/reviewCard";
import { getDueCards } from "../adapters/supabase";
import type { Deck } from "./DeckSelector";
import "./StudySession.css";
import ConfirmModal from "../components/confirmModal";

// ── SM-2 Konfiguration ────────────────────────────────────────────────────
const STEPS = [1, 10];
const EASY_INT = 4;
const GRAD_INT = 1;
const MIN_EASE = 1.3;
const REQUEUE_GAP = 3;

type CardState = "new" | "learning" | "review" | "relearning";
type Status = "loading" | "idle" | "done";

interface SessionCard {
  [key: string]: any;
  _state: CardState;
  _stepIndex: number;
}

function initCard(card: any): SessionCard {
  return {
    ...card,
    _state: (card.state as CardState) ?? "new",
    _stepIndex: card.step_index ?? 0,
  };
}

interface Props {
  deck: Deck;
  onClose: () => void;
}

const StudySession = ({ deck, onClose }: Props) => {
  const [status, setStatus] = useState<Status>("loading");
  const [queue, setQueue] = useState<SessionCard[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [totalUnique, setTotalUnique] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [confirmLeaveSession, setConfirmLeaveSession] = useState(false)

  const newCount = queue.filter((c) => c._state === "new").length;
  const learningCount = queue.filter(
    (c) => c._state === "learning" || c._state === "relearning",
  ).length;
  const reviewCount = queue.filter((c) => c._state === "review").length;

  useEffect(() => {
    getDueCards(deck.id).then((cards) => {
      const initialized = (cards ?? []).map(initCard);
      setQueue(initialized);
      setTotalUnique(initialized.length);
      setStatus(initialized.length === 0 ? "done" : "idle");
    });
  }, [deck.id]);

  const handleBack = () => {
    if (queue.length > 0 && status === "idle") {
      setConfirmLeaveSession(true)
    } else {
      onClose();
    }
  };

  // ── Queue-Helfer ──────────────────────────────────────────────────────

  const insertIntoQueue = (remaining: SessionCard[], card: SessionCard, gap = REQUEUE_GAP) => {
    const insertAt = Math.min(gap, remaining.length);
    const next = [...remaining];
    next.splice(insertAt, 0, card);
    return next;
  };

  const advance = (remaining: SessionCard[]) => {
    if (remaining.length === 0) setStatus("done");
    else setQueue(remaining);
    setShowAnswer(false);
  };

  // ── Rating-Logik ──────────────────────────────────────────────────────

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    const card = queue[0];
    const remaining = queue.slice(1);

    if (card._state === "new" || card._state === "learning") {
      if (rating === 1) {
        setQueue(insertIntoQueue(remaining, { ...card, _state: "learning", _stepIndex: 0 }));
        setShowAnswer(false);
        return;
      }
      if (rating === 4) {
        await reviewCard(card.id, rating, EASY_INT, card.ease_factor ?? 2.5, card.repetitions ?? 0);
        setReviewed((r) => r + 1);
        advance(remaining);
        return;
      }
      if (rating === 2) {
        setQueue(insertIntoQueue(remaining, { ...card, _state: "learning" }, REQUEUE_GAP + 1));
        setShowAnswer(false);
        return;
      }
      const nextStep = card._stepIndex + 1;
      if (nextStep >= STEPS.length) {
        await reviewCard(card.id, rating, GRAD_INT, card.ease_factor ?? 2.5, card.repetitions ?? 0);
        setReviewed((r) => r + 1);
        advance(remaining);
      } else {
        setQueue(insertIntoQueue(remaining, { ...card, _state: "learning", _stepIndex: nextStep }, REQUEUE_GAP + 2));
        setShowAnswer(false);
      }
      return;
    }

    if (card._state === "review") {
      await reviewCard(card.id, rating, card.interval ?? 1, card.ease_factor ?? 2.5, card.repetitions ?? 0);
      if (rating === 1) {
        setQueue(insertIntoQueue(remaining, {
          ...card,
          _state: "relearning",
          _stepIndex: 0,
          ease_factor: Math.max(MIN_EASE, (card.ease_factor ?? 2.5) - 0.2),
        }));
        setShowAnswer(false);
        return;
      }
      setReviewed((r) => r + 1);
      advance(remaining);
      return;
    }

    if (card._state === "relearning") {
      if (rating === 1) {
        setQueue(insertIntoQueue(remaining, { ...card, _stepIndex: 0 }));
        setShowAnswer(false);
        return;
      }
      const newInterval = Math.max(1, Math.round((card.interval ?? 1) * 0.5));
      await reviewCard(card.id, rating, newInterval, card.ease_factor ?? 2.5, card.repetitions ?? 0);
      advance(remaining);
      return;
    }
  };

  // ── UI-Helfer ─────────────────────────────────────────────────────────

  const getStateBadge = (state: CardState) =>
    ({
      new:        { label: "Neu",           className: "state-badge state-new" },
      learning:   { label: "Lernend",       className: "state-badge state-learning" },
      review:     { label: "Wiederholen",   className: "state-badge state-review" },
      relearning: { label: "Wieder-lernen", className: "state-badge state-relearning" },
    })[state];

  const getRatingSublabel = (rating: 1 | 2 | 3 | 4, card: SessionCard): string => {
    const isLearning = card._state === "new" || card._state === "learning" || card._state === "relearning";
    if (isLearning) {
      if (rating === 1) return "von vorne";
      if (rating === 2) return "gleicher Schritt";
      if (rating === 3) return card._stepIndex >= STEPS.length - 1 ? "abgeschlossen" : "nächster Schritt";
      if (rating === 4) return `in ${EASY_INT} Tagen`;
    } else {
      const ease = card.ease_factor ?? 2.5;
      const interval = card.interval ?? 1;
      if (rating === 1) return "heute nochmal";
      if (rating === 2) return `${Math.round(interval * 1.2)}d`;
      if (rating === 3) return `${Math.round(interval * ease)}d`;
      if (rating === 4) return `${Math.round(interval * ease * 1.3)}d`;
    }
    return "";
  };

  // ── Screens ───────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="study-wrapper">
        <div className="study-card">
          <p className="study-loading">Karten werden geladen…</p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="study-wrapper">
        <div className="study-card study-done">
          <div className="study-done-icon">✓</div>
          <h2 className="study-done-title">Fertig für heute</h2>
          <p className="study-done-subtitle">
            Alle fälligen Karten in <em>{deck.name}</em> erledigt.
          </p>
          <button className="study-back-btn" style={{ marginTop: 8, alignSelf: "center" }} onClick={onClose}>
            Beenden
          </button>
        </div>
      </div>
    );
  }

  const card = queue[0];
  const progress = totalUnique > 0 ? (reviewed / totalUnique) * 100 : 0;
  const badge = getStateBadge(card._state);

  return (
    <div className="study-wrapper">
      <div className="study-session-topbar">
        <button className="study-back-btn" onClick={handleBack}>
          ← {deck.name}
        </button>
      </div>

      <div className="study-progress-row">
        <div className="study-progress-bar">
          <div className="study-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="study-counter">{reviewed} / {totalUnique}</p>
      </div>

      <div className="study-stats-row">
        <span className="study-stat state-new">🔵 {newCount} neu</span>
        <span className="study-stat state-learning">🟡 {learningCount} lernend</span>
        <span className="study-stat state-review">🟢 {reviewCount} wiederholen</span>
      </div>

      <div className="study-card">
        <div className="study-card-header">
          <span className={badge.className}>{badge.label}</span>
        </div>

        <div className="study-front">
          {card.article && !card.reversed && (() => {
            const article = typeof card.article === "string" ? JSON.parse(card.article) : card.article;
            return <span className="study-article">{article?.indefinite ?? ""}</span>;
          })()}
          <h2 className="study-phrase">{card.reversed ? card.translation : card.phrase}</h2>
          {card.example && (
            <div className="study-example-box">
              <p className="study-example-label">Beispiel</p>
              <p className="study-example">{card.reversed ? card.example_translation : card.example}</p>
            </div>
          )}
        </div>

        {showAnswer && (
          <>
            <hr className="study-divider" />
            <div className="study-back">
              {card.article && card.reversed && (() => {
                const article = typeof card.article === "string" ? JSON.parse(card.article) : card.article;
                return <span className="study-article">{article?.indefinite ?? ""}</span>;
              })()}
              <p className="study-translation">{card.reversed ? card.phrase : card.translation}</p>
              {card.example_translation && (
                <p className="study-example-translation">
                  {card.reversed ? card.example : card.example_translation}
                </p>
              )}
              {card.grammar && <p className="study-grammar">{card.grammar}</p>}
              {card.conjugation && (() => {
                const conj = typeof card.conjugation === "string" ? JSON.parse(card.conjugation) : card.conjugation;
                return (
                  <details className="qc-details" style={{ marginTop: 16 }}>
                    <summary className="qc-details-summary">Konjugation</summary>
                    <div className="qc-details-grid">
                      {Object.entries(conj).map(([pronoun, form]) => (
                        <div key={pronoun} className="qc-details-row">
                          <span className="qc-details-label">{pronoun}</span>
                          <span className="qc-details-value">{form as string}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {!showAnswer ? (
        <button className="study-show-btn" onClick={() => setShowAnswer(true)}>
          Antwort zeigen
        </button>
      ) : (
        <div className="study-rating-row">
          {([1, 2, 3, 4] as const).map((r) => {
            const labels: Record<number, string> = { 1: "Vergessen", 2: "Schwer", 3: "Gut", 4: "Einfach" };
            return (
              <button key={r} className={`study-rating-btn rating-${r}`} onClick={() => handleRating(r)}>
                <span className="rating-number">{r}</span>
                <span className="rating-label">{labels[r]}</span>
                <span className="rating-sublabel">{getRatingSublabel(r, card)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION modal*/}
      {confirmLeaveSession && (
        <ConfirmModal
          message="Der Fortschritt wird nicht gespeichert, wenn du die Session frühzeitig verlässt. Möchtest du wirklich die Session beenden?"
          onConfirm={onClose}
          onCancel={() => setConfirmLeaveSession(false)}
          confirmBtnText="Verlassen"
        />
      )}

    </div>
  );
};

export default StudySession;