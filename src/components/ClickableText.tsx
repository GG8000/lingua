// src/components/ClickableText.tsx

import { useState, useRef } from "react"
import { translateWord } from "../adapters/gemini"
import "./ClickableText.css"

interface WordPopupData {
  word: string
  translation: string
  wordType: string
  x: number
  y: number
}

interface Props {
  text: string
  onWordSave?: (word: string, translation: string, wordType: string) => void
}

const ClickableText = ({ text, onWordSave }: Props) => {
  const [popup, setPopup] = useState<WordPopupData | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Text in Wörter + Leerzeichen/Satzzeichen aufteilen
  const tokens = text.split(/(\s+|[.,!?;:«»"'()\-–])/)

  const handleWordClick = async (word: string, e: React.MouseEvent) => {
    const clean = word.replace(/[.,!?;:«»"'()\-–]/g, "").trim()
    if (!clean || clean.length < 2) return

    e.stopPropagation()
    setLoading(clean)

    const rect = containerRef.current?.getBoundingClientRect()
    const x = e.clientX - (rect?.left ?? 0)
    const y = e.clientY - (rect?.top ?? 0)

    try {
      const result = await translateWord(clean)
      setPopup({ word: clean, translation: result.translation, wordType: result.wordType, x, y })
    } finally {
      setLoading(null)
    }
  }

  const handleSave = () => {
    if (!popup) return
    onWordSave?.(popup.word, popup.translation, popup.wordType)
    setSaved(prev => new Set(prev).add(popup.word))
    setPopup(null)
  }

  return (
    <div ref={containerRef} className="clickable-text-wrapper" onClick={() => setPopup(null)}>
      {tokens.map((token, i) => {
        const clean = token.replace(/[.,!?;:«»"'()\-–]/g, "").trim()
        const isWord = clean.length >= 2
        const isLoading = loading === clean
        const isSaved = saved.has(clean)

        return (
          <span
            key={i}
            className={`
              ${isWord ? "clickable-word" : ""}
              ${isLoading ? "clickable-word--loading" : ""}
              ${isSaved ? "clickable-word--saved" : ""}
            `}
            onClick={isWord ? (e) => handleWordClick(token, e) : undefined}
          >
            {token}
          </span>
        )
      })}

      {popup && (
        <>
          <div className="word-popup-backdrop" onClick={() => setPopup(null)} />
          <div
            className="word-popup"
            style={{ top: popup.y + 16, left: Math.min(popup.x, 260) }}
            onClick={e => e.stopPropagation()}
          >
            <p className="word-popup-word">{popup.word}</p>
            <p className="word-popup-translation">{popup.translation}</p>
            <p className="word-popup-type">{popup.wordType}</p>
            {saved.has(popup.word) ? (
              <p className="word-popup-saved">✓ Gespeichert</p>
            ) : (
              <button className="word-popup-add" onClick={handleSave}>
                + Zu Karten hinzufügen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ClickableText