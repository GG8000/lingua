import { useState } from "react"
import { supabase } from "../adapters/supabase"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"login" | "register">("login")
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "confirm">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async () => {
  setStatus("loading")
  setErrorMsg("")

  if (mode === "register") {
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setErrorMsg(error.message)
      setStatus("error")
      return
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        native_language: "german"
      })
    }

    setStatus("confirm")
    return
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    setErrorMsg(error.message)
    setStatus("error")
  }
}
  if (status === "confirm") {
    return (
        <div className="login-wrapper">
        <div className="login-card">
            <h1 className="qc-title">Fast geschafft</h1>
            <div className="qc-divider" />
            <p style={{ color: "#6B4A2A", lineHeight: 1.7, fontSize: 15 }}>
            Wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet.
            Bitte klicke auf den Link um dein Konto zu aktivieren.
            </p>
            <p
            className="login-toggle"
            onClick={() => {
                setStatus("idle")
                setMode("login")
            }}
            >
            Zurück zum Login
            </p>
        </div>
        </div>
    )
    }
    return (
    <div className="login-wrapper">
        <div className="login-card">
        <h1 className="qc-title">Lingua</h1>
        <p className="qc-subtitle">
            {mode === "login" ? "Willkommen zurück" : "Konto erstellen"}
        </p>

        <div className="qc-divider" />

        <label className="qc-label">E-Mail</label>
        <input
            className="qc-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@email.com"
        />

        <label className="qc-label">Passwort</label>
        <input
            className="qc-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
        />

        <button
            className="qc-button"
            onClick={handleSubmit}
            disabled={status === "loading" || !email || !password}
        >
            {status === "loading"
            ? "Laden..."
            : mode === "login" ? "Einloggen" : "Registrieren"}
        </button>

        {status === "error" && (
            <p className="qc-status error">{errorMsg}</p>
        )}

        <p
            className="login-toggle"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
            {mode === "login"
            ? "Noch kein Konto? Registrieren"
            : "Bereits ein Konto? Einloggen"}
        </p>
        </div>
    </div>
    )
}


export default Login