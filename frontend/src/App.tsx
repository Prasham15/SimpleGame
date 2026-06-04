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

type GameState = 'idle' | 'playing' | 'gameover'

function App() {
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  
  // Score submission state
  const [username, setUsername] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true)

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
  }, [])

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

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setSubmitting(true)
    setSubmitError(null)

    fetch('http://localhost:8080/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.trim(),
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
        
        {/* Left Side: Game Area */}
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

          {/* Game Interface */}
          <div className="game-wrapper">
            {gameState === 'idle' && (
              <div className="game-screen-center">
                <div className="intro-icon">🎯</div>
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
                  <form className="score-form" onSubmit={handleSubmitScore}>
                    <h3>Submit your score to Leaderboard</h3>
                    <div className="form-group">
                      <input
                        type="text"
                        className="input-username"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.slice(0, 15))}
                        maxLength={15}
                        required
                        disabled={submitting}
                      />
                      <button type="submit" className="btn-submit" disabled={submitting || !username.trim()}>
                        {submitting ? 'SUBMITTING...' : 'SUBMIT'}
                      </button>
                    </div>
                    {submitError && <p className="error-text-form">{submitError}</p>}
                  </form>
                ) : (
                  <div className="submit-success">
                    <p>🎉 Score submitted successfully!</p>
                  </div>
                )}

                <button className="btn-primary" style={{ marginTop: '15px' }} onClick={startGame}>
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>
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
