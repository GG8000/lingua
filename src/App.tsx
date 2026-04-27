import { useState, useEffect } from "react"
import { supabase } from "./adapters/supabase"
import { Analytics } from "@vercel/analytics/react"
import type { User } from "@supabase/supabase-js"
import QuickCapture from "./mobile/QuickCapture"
import StudySession from "./study-session/StudySession"
import Profile from "./profile/Profile"
import Login from "./auth/Login"

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStudy, setShowStudy] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="app-loading">...</div>
  if (!user) return <Login />

  return (
    <div className="app">
      {showStudy ? (
        <StudySession onClose={() => setShowStudy(false)} />
      ) : (
        <QuickCapture
          onStudyOpen={() => setShowStudy(true)}
          onProfileOpen={() => setShowProfile(true)}
        />
      )}
      <Profile
        open={showProfile}
        onClose={() => setShowProfile(false)}
      />
    <Analytics/>
    </div>
  )
}

export default App