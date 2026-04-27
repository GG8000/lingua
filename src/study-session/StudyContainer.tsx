import { useState } from "react";
import DeckSelector from "./DeckSelector";
import DeckCardList from "./DeckCardList";
import StudySession from "./StudySession";
import type { Deck } from "./DeckSelector";
import "../study-session/StudySession.css";

type View = "selecting" | "editing" | "studying";

interface Props {
  onClose: () => void;
}

const StudyContainer = ({ onClose }: Props) => {
  const [view, setView] = useState<View>("selecting");
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  return (
    <>
      {view === "selecting" && (
        <DeckSelector
          onClose={onClose}
          onStartDeck={(deck) => {
            setSelectedDeck(deck);
            setView("studying");
          }}
          onEditDeck={(deck) => {
            setSelectedDeck(deck);
            setView("editing");
          }}
        />
      )}

      {view === "editing" && selectedDeck && (
        <DeckCardList
          deck={selectedDeck}
          onBack={() => setView("selecting")}
        />
      )}

      {view === "studying" && selectedDeck && (
        <StudySession
          deck={selectedDeck}
          onClose={() => setView("selecting")}
        />
      )}
    </>
  );
};

export default StudyContainer;