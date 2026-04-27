import { useState } from "react";
import { supabase, existsEmail } from "../adapters/supabase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [resetSent, setResetSent] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "confirm"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    setStatus("loading");
    setErrorMsg("");

    if (mode === "register") {
      if (confirmPassword !== password) {
        setErrorMsg("Passwörter stimmen nicht überein!");
        setStatus("error");
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password })

      console.log(data, error)

      if (error) {
        if (error.message.includes("already registered")) {
          setErrorMsg("Diese E-Mail ist bereits registriert. Bitte einloggen.")
        } else {
          setErrorMsg(error.message)
        }
        setStatus("error")
        return
      }

      const emailExists = await existsEmail(email)

      if (emailExists) {
        setErrorMsg("Diese E-Mail ist bereits registriert. Bitte einloggen.")
        setStatus("error")
        return
      }

      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          native_language: "german",
        });
      }

      setStatus("confirm");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    }
  };

  const handleReset = async () => {
    setStatus("loading");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://deine-app.vercel.app",
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setResetSent(true);
      setStatus("idle");
    }
  };

  if (status === "confirm") {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <h1 className="qc-title">Fast geschafft</h1>
          <div className="qc-divider" />
          <p style={{ color: "#6B4A2A", lineHeight: 1.7, fontSize: 15 }}>
            Wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong>{" "}
            gesendet. Bitte klicke auf den Link um dein Konto zu aktivieren.
          </p>
          <p
            className="login-toggle"
            onClick={() => {
              setStatus("idle");
              setMode("login");
            }}
          >
            Zurück zum Login
          </p>
        </div>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          {resetSent ? (
            <>
              <h1 className="qc-title">E-Mail gesendet</h1>
              <div className="qc-divider" />
              <p style={{ color: "#6B4A2A", lineHeight: 1.7, fontSize: 15 }}>
                Wir haben einen Link an <strong>{email}</strong> gesendet.
              </p>
              <p
                className="login-toggle"
                onClick={() => {
                  setMode("login");
                  setResetSent(false);
                }}
              >
                Zurück zum Login
              </p>
            </>
          ) : (
            <>
              <h1 className="qc-title">Passwort zurücksetzen</h1>
              <div className="qc-divider" />
              <label className="qc-label">E-Mail</label>
              <input
                className="qc-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.com"
              />
              <button
                className="qc-button"
                onClick={handleReset}
                disabled={status === "loading" || !email}
              >
                {status === "loading" ? "Laden..." : "Link senden"}
              </button>
              {status === "error" && (
                <p className="qc-status error">{errorMsg}</p>
              )}
              <p className="login-toggle" onClick={() => setMode("login")}>
                ← Zurück zum Login
              </p>
            </>
          )}
        </div>
      </div>
    );
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
        <div className="input-wrapper">
          <input
            className="qc-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ paddingRight: 44 }}
          />
          <button
            className="input-eye-btn"
            onClick={() => setShowPassword((p) => !p)}
            type="button"
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>

        {mode === "register" && (
          <>
            <label className="qc-label">Passwort Bestätigen</label>
            <div className="input-wrapper">
              <input
                className="qc-input"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                className="input-eye-btn"
                onClick={() => setShowPassword((p) => !p)}
                type="button"
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </>
        )}

        <button
          className="qc-button"
          onClick={handleSubmit}
          disabled={status === "loading" || !email || !password}
        >
          {status === "loading"
            ? "Laden..."
            : mode === "login"
              ? "Einloggen"
              : "Registrieren"}
        </button>

        {status === "error" && <p className="qc-status error">{errorMsg}</p>}

        <p
          className="login-toggle"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Noch kein Konto? Registrieren"
            : "Bereits ein Konto? Einloggen"}
        </p>

        <p className="login-toggle" onClick={() => setMode("reset")}>
          Passwort vergessen?
        </p>
      </div>
    </div>
  );
};

export default Login;
