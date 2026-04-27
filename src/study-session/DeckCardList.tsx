import { useEffect, useState } from "react";
import { getCardsByDeck, updateCard, deleteCardPair, deleteAllCards } from "../adapters/supabase";
import ConfirmModal from "../components/confirmModal"
import type { Deck } from "./DeckSelector";
import "../study-session/StudySession.css";

interface Props {
  deck: Deck;
  onBack: () => void;
}

interface EditCardFormProps {
  card: any;
  onSave: (updates: any) => void;
  onCancel: () => void;
}

const EditCardForm = ({ card, onSave, onCancel }: EditCardFormProps) => {
  const [phrase, setPhrase] = useState(card.phrase);
  const [translation, setTranslation] = useState(card.translation);
  const [example, setExample] = useState(card.example ?? "");
  const [exampleTranslation, setExampleTranslation] = useState(
    card.example_translation ?? "",
  );
  const [grammar, setGrammar] = useState(card.grammar ?? "");

  return (
    <div className="qc-result">
      <label className="qc-label">Phrase</label>
      <input
        className="qc-input"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
      />
      <label className="qc-label">Übersetzung</label>
      <input
        className="qc-input"
        value={translation}
        onChange={(e) => setTranslation(e.target.value)}
      />
      <label className="qc-label">Beispiel</label>
      <input
        className="qc-input"
        value={example}
        onChange={(e) => setExample(e.target.value)}
      />
      <label className="qc-label">Beispiel Übersetzung</label>
      <input
        className="qc-input"
        value={exampleTranslation}
        onChange={(e) => setExampleTranslation(e.target.value)}
      />
      <label className="qc-label">Grammatik</label>
      <input
        className="qc-input"
        value={grammar}
        onChange={(e) => setGrammar(e.target.value)}
      />
      <button
        className="qc-button"
        onClick={() =>
          onSave({
            phrase,
            translation,
            example,
            example_translation: exampleTranslation,
            grammar,
          })
        }
      >
        Speichern
      </button>
      <button
        className="profile-logout"
        style={{ marginTop: 8 }}
        onClick={onCancel}
      >
        Abbrechen
      </button>
    </div>
  );
};

const DeckCardList = ({ deck, onBack }: Props) => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [confirmCard, setConfirmCard] = useState<any | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  useEffect(() => {
    getCardsByDeck(deck.id).then((data) => {
      setCards(data ?? []);
      setLoading(false);
    });
  }, [deck.id]);

  const handleDelete = async (card: any) => {
    setConfirmCard(card)
  };

  const handleDeleteAll = async () => {
    setConfirmDeleteAll(true)
  }

  const handleSave = async (updates: any) => {
    await updateCard(editingCard.id, updates);
    setCards((prev) =>
      prev.map((c) => (c.id === editingCard.id ? { ...c, ...updates } : c)),
    );
    setEditingCard(null);
  };

  return (
    <div className="study-wrapper">
      <button className="study-back-btn" onClick={onBack}>
        ← {deck.name}
      </button>

      <div className="deck-header">
        <h1 className="deck-title">Karten</h1>
        <p className="deck-subtitle">{cards.length} Karten im Deck</p>
      </div>

      {loading ? (
        <div className="study-card">
          <p className="study-loading">Laden…</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="study-card">
          <p className="study-loading">Keine Karten gefunden.</p>
        </div>
      ) : (
        <div className="deck-list">
          {cards.map((card) => (
            <div key={card.id} className="card-item">
              <div
                className="card-item-content"
                onClick={() => setEditingCard(card)}
              >
                <span className="card-item-phrase">{card.phrase}</span>
                <span className="card-item-translation">{card.translation}</span>
              </div>
              <button
                className="deck-menu-btn"
                onClick={() => handleDelete(card)}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
        <button className="deck-delete-all-btn" onClick={handleDeleteAll}>
           🗑 Alle Karten löschen
        </button>

      {/* Edit Sheet */}
      {editingCard && (
        <>
          <div className="qc-backdrop" onClick={() => setEditingCard(null)} />
          <div className="qc-sheet qc-sheet--open">
            <div
              className="qc-sheet-handle"
              onClick={() => setEditingCard(null)}
            />
            <EditCardForm
              card={editingCard}
              onSave={handleSave}
              onCancel={() => setEditingCard(null)}
            />
          </div>
        </>
      )}

      {confirmCard && (
        <ConfirmModal
            message={`"${confirmCard.phrase}" löschen?`}
            onConfirm={async () => {
            await deleteCardPair(confirmCard.phrase, confirmCard.deck_id)
            setCards(prev => prev.filter(c => c.phrase !== confirmCard.phrase))
            setConfirmCard(null)
            }}
            onCancel={() => setConfirmCard(null)}
            confirmBtnText="Löschen"
        />
        )}

        {confirmDeleteAll && (
        <ConfirmModal
            message="Alle Karten in diesem Deck löschen?"
            onConfirm={async () => {
            await deleteAllCards(deck.id)
            setCards([])
            setConfirmDeleteAll(false)
            }}
            onCancel={() => setConfirmDeleteAll(false)}
            confirmBtnText="Löschen"
        />
        )}
    </div>
  );
};

export default DeckCardList;