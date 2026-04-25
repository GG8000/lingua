import { useEffect, useState } from "react";
import { supabase, getProfile, updateProfile } from "../adapters/supabase";
import type { Language } from "../domain/models";
import "./Profile.css";

const LANG_LABELS: Record<Language, string> = {
  french: "Français",
  italian: "Italiano",
  german: "Deutsch",
  english: "English"
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const Profile = ({ open, onClose }: Props) => {
  const [email, setEmail] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState<Language | null>(null);
  const [status, setStatus] = useState<"error" | "loading" | "saving" | "idle">(
    "loading",
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load_email = async () => {
      const user = await supabase.auth.getUser();
      setEmail(user?.data?.user?.email as string);
    };
    load_email();

    const load_profile = async () => {
      const profile = await getProfile();
      setNativeLanguage(profile?.native_language as Language);
      setStatus("idle");
    };
    load_profile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleLanguageChange = async (lang: Language) => {
    setNativeLanguage(lang);
    setStatus("saving");
    await updateProfile(lang);
    setStatus("idle");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!open) return null

  if (status === "loading") {
    return (
      <div className="profile-wrapper">
        <div className="profile-card">
          <p className="profile-loading">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {open && <div className="qc-backdrop" onClick={onClose} />}
      <div className={`qc-sheet ${open ? "qc-sheet--open" : ""}`}>
        <div className="qc-sheet-handle" onClick={onClose} />
        {/* Profil-Inhalt hier */}
        <div className="profile-avatar">{email.charAt(0).toUpperCase()}</div>
        <p className="profile-email">{email}</p>
        <div className="qc-divider" style={{ margin: "20px 0" }} />
        <label className="qc-label">Muttersprache</label>
        <select
          className="qc-select"
          style={{ width: "100%", marginBottom: 8 }}
          value={nativeLanguage ?? "german"}
          onChange={(e) => handleLanguageChange(e.target.value as Language)}
        >
          {Object.keys(LANG_LABELS).map((lang) => (
            <option key={lang} value={lang}>
              {LANG_LABELS[lang as Language]}
            </option>
          ))}
        </select>
        {saved && <p className="profile-saved">✓ Gespeichert</p>}
        <div className="qc-divider" style={{ margin: "20px 0" }} />
        <button className="profile-logout" onClick={handleLogout}>
          Abmelden
        </button>
      </div>
    </>
  );
};

export default Profile;
