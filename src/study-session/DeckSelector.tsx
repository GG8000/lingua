import { useEffect, useState } from "react";
import { getDecks } from "../adapters/supabase";
import "../study-session/StudySession.css";

export interface Deck {
  id: string;
  name: string;
  due_count: number;
  total_count: number;
}

interface Props {
  onClose: () => void;
  onStartDeck: (deck: Deck) => void;
  onEditDeck: (deck: Deck) => void;
}

const DeckSelector = ({ onClose, onStartDeck, onEditDeck }: Props) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDecks().then((data) => {
      setDecks(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="study-wrapper">
      <button className="study-back-btn" onClick={onClose}>
        ← Zurück
      </button>

      <div className="deck-header">
        <h1 className="deck-title">Lernset wählen</h1>
        <p className="deck-subtitle">
          Wähle ein Deck, das du heute lernen möchtest.
        </p>
      </div>

      {loading ? (
        <div className="study-card">
          <p className="study-loading">Laden…</p>
        </div>
      ) : decks.length === 0 ? (
        <div className="study-card">
          <p className="study-loading">Keine Decks gefunden.</p>
        </div>
      ) : (
        <div className="deck-list">
          {decks.map((deck) => (
            <div key={deck.id} className="deck-item-wrapper">
              <button
                className="deck-item"
                onClick={() => onStartDeck(deck)}
                disabled={deck.due_count === 0}
              >
                <div className="deck-item-left">
                  <span className="deck-item-name">{deck.name}</span>
                  <span className="deck-item-total">
                    {deck.total_count} Karten gesamt
                  </span>
                </div>
                <div className="deck-item-right">
                  {deck.due_count > 0 ? (
                    <span className="deck-due-badge">
                      {deck.due_count} fällig
                    </span>
                  ) : (
                    <span className="deck-done-badge">erledigt ✓</span>
                  )}
                </div>
              </button>
              <button
                className="deck-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditDeck(deck);
                }}
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeckSelector;