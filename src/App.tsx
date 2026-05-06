import { useState, useEffect } from "react"
import { supabase } from "./adapters/supabase"
import { Analytics } from "@vercel/analytics/react"
import type { User } from "@supabase/supabase-js"
import QuickCapture from "./mobile/QuickCapture"
import StudyContainer from "./study-session/StudyContainer"
import Profile from "./profile/Profile"
import Login from "./auth/Login"
// import ReadingSession from "./reading/ReadingSession"

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStudy, setShowStudy] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showReading, setShowReading] = useState(false)

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
      {showReading ? (
        //<ReadingSession onClose={() => setShowReading(false)} />
        <h1 onClick={() => {setShowReading(false)}}>Hello</h1>
      ) : showStudy ? (
        <StudyContainer onClose={() => setShowStudy(false)} />
      ) : (
        <QuickCapture
          onStudyOpen={() => setShowStudy(true)}
          onProfileOpen={() => setShowProfile(true)}
          //onReadingOpen={() => setShowReading(true)}
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