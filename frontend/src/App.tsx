import { useState, useEffect, useRef } from 'react'
import './App.css'

interface StatusResponse {
  status: string
  message: string
}

interface ScoreEntry {
  id: number
  username: string
  score: number
  createdAt: string
}

interface PersonalStats {
  username: string
  bestScore: number
  totalGames: number
  averageScore: number
  rank: string
}

type GameState = 'idle' | 'playing' | 'gameover'
type AuthMode = 'login' | 'register'

function App() {
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  
  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('token'))
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('username'))
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authUsername, setAuthUsername] = useState<string>('')
  const [authPassword, setAuthPassword] = useState<string>('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)

  // Score submission state
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true)

  // Personal Stats state
  const [stats, setStats] = useState<PersonalStats | null>(null)
  const [loadingStats, setLoadingStats] = useState<boolean>(false)

  const timerRef = useRef<number | null>(null)
  const gameAreaRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Check status
    fetch('http://localhost:8080/api/status')
      .then((res) => res.json())
      .then((data: StatusResponse) => setBackendStatus(data))
      .catch(() => setBackendStatus(null))

    // Fetch leaderboard
    fetchLeaderboard()

    // Fetch stats if already logged in
    if (authToken) {
      fetchPersonalStats(authToken)
    }
  }, [authToken])

  const fetchLeaderboard = () => {
    setLoadingLeaderboard(true)
    fetch('http://localhost:8080/leaderboard')
      .then((res) => res.json())
      .then((data: ScoreEntry[]) => {
        setLeaderboard(data)
        setLoadingLeaderboard(false)
      })
      .catch(() => {
        setLoadingLeaderboard(false)
      })
  }

  const fetchPersonalStats = (token: string) => {
    setLoadingStats(true)
    fetch('http://localhost:8080/api/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data: PersonalStats) => {
        setStats(data)
        setLoadingStats(false)
      })
      .catch(() => {
        setStats(null)
        setLoadingStats(false)
      })
  }

  // Timer countdown
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current)
            setGameState('gameover')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [gameState])

  const startGame = () => {
    setScore(0)
    setTimeLeft(30)
    setSubmitted(false)
    setSubmitError(null)
    setGameState('playing')
    setTimeout(moveTarget, 50)
  }

  const moveTarget = () => {
    if (!gameAreaRef.current) return
    const rect = gameAreaRef.current.getBoundingClientRect()
    const maxX = rect.width - 80
    const maxY = rect.height - 80
    const randomX = Math.max(10, Math.floor(Math.random() * maxX))
    const randomY = Math.max(10, Math.floor(Math.random() * maxY))
    setTargetPosition({ x: randomX, y: randomY })
  }

  const handleTargetClick = () => {
    if (gameState !== 'playing') return
    setScore((prev) => prev + 1)
    moveTarget()
  }

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)

    const url = authMode === 'register' 
      ? 'http://localhost:8080/api/auth/register' 
      : 'http://localhost:8080/api/auth/login'

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: authUsername.trim(),
        password: authPassword
      })
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed')
        }
        return data
      })
      .then((data) => {
        if (authMode === 'register') {
          setAuthSuccess('Registration successful! Please login.')
          setAuthMode('login')
          setAuthPassword('')
        } else {
          localStorage.setItem('token', data.token)
          localStorage.setItem('username', data.username)
          setAuthToken(data.token)
          setCurrentUser(data.username)
          setAuthUsername('')
          setAuthPassword('')
        }
      })
      .catch((err) => {
        setAuthError(err.message || 'An error occurred during authentication.')
      })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setAuthToken(null)
    setCurrentUser(null)
    setStats(null)
    setGameState('idle')
  }

  const handleSubmitScore = () => {
    if (!authToken) return

    setSubmitting(true)
    setSubmitError(null)

    fetch('http://localhost:8080/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        score: score
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to submit score')
        }
        return res.json()
      })
      .then(() => {
        setSubmitted(true)
        setSubmitting(false)
        fetchLeaderboard() // Refresh the leaderboard instantly
        fetchPersonalStats(authToken) // Refresh personal stats instantly
      })
      .catch((err) => {
        setSubmitError(err.message || 'Error submitting score. Please try again.')
        setSubmitting(false)
      })
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="app-container">
      <div className="glass-card main-layout">
        
        {/* Left Side: Game Section or Auth Forms */}
        <div className="game-section">
          {/* Header containing status badge and title */}
          <div className="game-header">
            <div className="system-status">
              <span className="label">API:</span>
              {backendStatus ? (
                <span className="badge success-micro">
                  <span className="dot pulse"></span> ONLINE
                </span>
              ) : (
                <span className="badge danger-micro">
                  <span className="dot"></span> OFFLINE
                </span>
              )}
            </div>
            <div className="title-glowing">NEON TAP SPEEDER</div>
            <p className="subtitle">Tap the glowing cores before time runs out!</p>
          </div>

          {/* If not logged in, show login/register forms */}
          {!authToken ? (
            <div className="auth-wrapper">
              <div className="auth-tabs">
                <button 
                  className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('login'); setAuthError(null); setAuthSuccess(null); }}
                >
                  LOGIN
                </button>
                <button 
                  className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('register'); setAuthError(null); setAuthSuccess(null); }}
                >
                  REGISTER
                </button>
              </div>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <h2>{authMode === 'login' ? 'Welcome Back Speeder' : 'Create Speeder Account'}</h2>
                <p className="auth-desc">
                  {authMode === 'login' 
                    ? 'Login to compete globally and track your scores.' 
                    : 'Sign up to start saving your click speed achievements.'}
                </p>

                {authError && <div className="auth-alert error">{authError}</div>}
                {authSuccess && <div className="auth-alert success">{authSuccess}</div>}

                <div className="auth-input-group">
                  <label htmlFor="auth-user">Username</label>
                  <input
                    id="auth-user"
                    type="text"
                    className="input-field"
                    placeholder="Alphanumeric, 2-15 chars"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-input-group">
                  <label htmlFor="auth-pass">Password</label>
                  <input
                    id="auth-pass"
                    type="password"
                    className="input-field"
                    placeholder="Min 4 characters"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary auth-submit-btn">
                  {authMode === 'login' ? 'ENTER GAME' : 'CREATE ACCOUNT'}
                </button>
              </form>
            </div>
          ) : (
            /* Game Interface for Logged-in Users */
            <div className="game-wrapper">
              
              <div className="user-profile-bar">
                <span>⚡ Active Speeder: <strong className="user-glow">{currentUser}</strong></span>
                <button className="btn-logout" onClick={handleLogout}>LOGOUT</button>
              </div>

              {gameState === 'idle' && (
                <div className="game-screen-center">
                  
                  {/* Personal Stats Dashboard */}
                  {stats && (
                    <div className="stats-dashboard">
                      <div className="stats-grid">
                        <div className="stats-box">
                          <span className="stats-label">GLOBAL RANK</span>
                          <span className="stats-val rank-highlight">{stats.rank}</span>
                        </div>
                        <div className="stats-box">
                          <span className="stats-label">PERSONAL BEST</span>
                          <span className="stats-val">{stats.bestScore}</span>
                        </div>
                        <div className="stats-box">
                          <span className="stats-label">GAMES PLAYED</span>
                          <span className="stats-val">{stats.totalGames}</span>
                        </div>
                        <div className="stats-box">
                          <span className="stats-label">AVG SCORE</span>
                          <span className="stats-val">{stats.averageScore}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="intro-icon" style={{ marginTop: stats ? '15px' : '30px' }}>🎯</div>
                  <h2>Ready to test your speed?</h2>
                  <p>You have 30 seconds to tap the target as many times as possible. Each tap moves the target.</p>
                  <button className="btn-primary" onClick={startGame}>
                    START GAME
                  </button>
                </div>
              )}

              {gameState === 'playing' && (
                <div className="game-screen-play">
                  <div className="hud">
                    <div className="hud-item">
                      <span className="hud-label">TIME LEFT</span>
                      <span className="hud-val highlight">{timeLeft}s</span>
                    </div>
                    <div className="hud-item">
                      <span className="hud-label">SCORE</span>
                      <span className="hud-val">{score}</span>
                    </div>
                  </div>
                  <div className="game-area" ref={gameAreaRef}>
                    <button
                      className="game-target"
                      style={{ left: `${targetPosition.x}px`, top: `${targetPosition.y}px` }}
                      onClick={handleTargetClick}
                      aria-label="Click target"
                    >
                      <span className="core-glow"></span>
                    </button>
                  </div>
                </div>
              )}

              {gameState === 'gameover' && (
                <div className="game-screen-center">
                  <div className="intro-icon">🏆</div>
                  <h2>Game Over!</h2>
                  <p className="final-score-text">
                    You scored <span className="final-score">{score}</span> taps!
                  </p>
                  
                  {!submitted ? (
                    <div className="score-form-container">
                      <button 
                        className="btn-primary btn-save-score" 
                        onClick={handleSubmitScore} 
                        disabled={submitting}
                      >
                        {submitting ? 'SAVING...' : 'SAVE SCORE TO LEADERBOARD'}
                      </button>
                      {submitError && <p className="error-text-form">{submitError}</p>}
                    </div>
                  ) : (
                    <div className="submit-success">
                      <p>🎉 Score saved to Global Leaderboard!</p>
                    </div>
                  )}

                  <button className="btn-secondary-action" onClick={startGame}>
                    PLAY AGAIN
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Global Leaderboard */}
        <div className="leaderboard-section">
          <div className="leaderboard-header">
            <h3>GLOBAL RANKINGS</h3>
            <button className="btn-refresh" onClick={fetchLeaderboard} title="Refresh rankings">
              🔄
            </button>
          </div>

          <div className="leaderboard-list-container">
            {loadingLeaderboard ? (
              <div className="leaderboard-loader">Loading rankings...</div>
            ) : leaderboard.length === 0 ? (
              <div className="leaderboard-empty">No scores submitted yet. Be the first!</div>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.map((entry, index) => (
                  <div key={entry.id} className={`leaderboard-item rank-${index + 1}`}>
                    <div className="rank-badge">{index + 1}</div>
                    <div className="user-details">
                      <span className="username">{entry.username}</span>
                      <span className="date">{formatDate(entry.createdAt)}</span>
                    </div>
                    <div className="score-val">{entry.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
