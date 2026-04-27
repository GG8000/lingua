// src/components/ConfirmModal.tsx
import "./confirmModal.css"


interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmBtnText : string
}

const ConfirmModal = ({ message, onConfirm, onCancel, confirmBtnText = "Löschen" }: Props) => {
  return (
    <>
      <div className="qc-backdrop" onClick={onCancel} />
      <div className="confirm-modal">
        <p className="confirm-text">{message}</p>
        <div className="confirm-buttons">
          <button className="confirm-cancel" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="confirm-delete" onClick={onConfirm}>
            {confirmBtnText}
          </button>
        </div>
      </div>
    </>
  )
}

export default ConfirmModal