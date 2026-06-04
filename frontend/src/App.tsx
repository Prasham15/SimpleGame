import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode === 'UN' || countryCode === 'unknown') {
    return '🌍'
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

interface StatusResponse {
  status: string
  message: string
}

interface ScoreEntry {
  id: number
  username: string
  score: number
  createdAt: string
  game: string
  countryCode: string
}

interface PersonalStats {
  username: string
  bestScore: number
  totalGames: number
  averageScore: number
  rank: string
  game: string
}

type GameState = 'idle' | 'playing' | 'gameover'
type AuthMode = 'login' | 'register'
type GameType = 'tap_speeder' | 'neon_runner'

function App() {
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  
  // Game Selector state
  const [selectedGame, setSelectedGame] = useState<GameType>('tap_speeder')

  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('token'))
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('username'))
  const [userCountry, setUserCountry] = useState<string | null>(localStorage.getItem('countryCode'))
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loadingGuest, setLoadingGuest] = useState<boolean>(false)
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

  const timerRef = useRef<number | null>(null)
  const gameAreaRef = useRef<HTMLDivElement | null>(null)
  const runnerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const runnerAnimationFrameRef = useRef<number | null>(null)
  const touchStartX = useRef<number>(0)

  // Endless Runner game loop state (kept in mutable ref to run cleanly at 60fps)
  const runnerStateRef = useRef({
    playerY: 230,
    playerVy: 0.0,
    isJumping: false,
    obstacles: [] as Array<{ x: number; width: number; height: number; speed: number }>,
    speed: 5.0,
    score: 0,
    startTime: 0,
    lastObstacleSpawnTime: 0,
    gameOver: false
  })

  // General Status checking on boot
  useEffect(() => {
    fetch(`${API_URL}/api/status`)
      .then((res) => res.json())
      .then((data: StatusResponse) => setBackendStatus(data))
      .catch(() => setBackendStatus(null))
  }, [])

  // Refetch leaderboard & stats when game selector changes or auth changes
  useEffect(() => {
    fetchLeaderboard(selectedGame)
    if (authToken) {
      fetchPersonalStats(authToken, selectedGame)
    } else {
      setStats(null)
    }

    // Cancel running games if user switches games mid-play
    setGameState('idle')
    if (runnerAnimationFrameRef.current) {
      cancelAnimationFrame(runnerAnimationFrameRef.current)
    }
  }, [selectedGame, authToken])

  const fetchLeaderboard = (game: GameType) => {
    setLoadingLeaderboard(true)
    fetch(`${API_URL}/leaderboard?game=${game}`)
      .then((res) => res.json())
      .then((data: ScoreEntry[]) => {
        setLeaderboard(data)
        setLoadingLeaderboard(false)
      })
      .catch(() => {
        setLoadingLeaderboard(false)
      })
  }

  const fetchPersonalStats = (token: string, game: GameType) => {
    fetch(`${API_URL}/api/stats?game=${game}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data: PersonalStats & { countryCode?: string }) => {
        setStats(data)
        if (data.countryCode) {
          setUserCountry(data.countryCode)
          localStorage.setItem('countryCode', data.countryCode)
        }
      })
      .catch(() => {
        setStats(null)
      })
  }

  // Timer countdown (strictly for Tap Speeder game)
  useEffect(() => {
    if (gameState === 'playing' && selectedGame === 'tap_speeder') {
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
  }, [gameState, selectedGame])

  // Automatically submit score when game reaches gameover
  useEffect(() => {
    if (gameState === 'gameover') {
      handleSubmitScore(score, selectedGame)
    }
  }, [gameState])

  // Watch keyboard commands for jumping in Neon Runner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || selectedGame !== 'neon_runner') return
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        handleRunnerJump()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gameState, selectedGame])

  // Cleanup game animations on unmount
  useEffect(() => {
    return () => {
      if (runnerAnimationFrameRef.current) {
        cancelAnimationFrame(runnerAnimationFrameRef.current)
      }
    }
  }, [])

  const startGame = () => {
    setScore(0)
    setTimeLeft(30)
    setSubmitted(false)
    setSubmitError(null)
    setGameState('playing')

    if (selectedGame === 'tap_speeder') {
      setTimeout(moveTarget, 50)
    } else if (selectedGame === 'neon_runner') {
      setTimeout(startRunnerGame, 50)
    }
  }

  // Tap Speeder target movement
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

  // Neon Runner Physics loop
  const handleRunnerJump = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (gameState === 'playing' && !runnerStateRef.current.isJumping) {
      runnerStateRef.current.playerVy = -11.0
      runnerStateRef.current.isJumping = true
    }
  }

  const startRunnerGame = () => {
    const canvas = runnerCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const state = runnerStateRef.current
    state.playerY = 230
    state.playerVy = 0.0
    state.isJumping = false
    state.obstacles = []
    state.speed = 5.0
    state.score = 0
    state.startTime = Date.now()
    state.lastObstacleSpawnTime = 0
    state.gameOver = false

    const loop = () => {
      if (state.gameOver || !runnerCanvasRef.current) return

      const now = Date.now()

      const elapsed = now - state.startTime
      
      // Update Score: 1 point per second survived
      state.score = Math.floor(elapsed / 1000)
      setScore(state.score)

      // Speed increases by 0.5 every 5 seconds, max speed limit is 12
      state.speed = Math.min(12.0, 5.0 + (elapsed / 5000) * 0.5)

      // Physics: gravity velocity additions
      state.playerVy += 0.6
      state.playerY += state.playerVy

      // Land on floor check (Y coordinate 230)
      if (state.playerY >= 230) {
        state.playerY = 230
        state.playerVy = 0.0
        state.isJumping = false
      }

      // Obstacle Spawns: random spikes spawning
      const spawnInterval = Math.max(1100, 2200 - (state.speed - 5.0) * 180)
      if (now - state.lastObstacleSpawnTime > spawnInterval) {
        const obsHeight = 30 + Math.floor(Math.random() * 25)
        const obsWidth = 20 + Math.floor(Math.random() * 15)

        state.obstacles.push({
          x: 600,
          width: obsWidth,
          height: obsHeight,
          speed: state.speed
        })
        state.lastObstacleSpawnTime = now
      }

      // Update Obstacles position & crash detections
      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i]
        obs.x -= state.speed

        // Bounding collision checks (Player: x=60, y=playerY, w=32, h=32)
        const playerX = 60
        const playerWidth = 32
        const playerHeight = 32

        const pLeft = playerX
        const pRight = playerX + playerWidth
        const pTop = state.playerY
        const pBottom = state.playerY + playerHeight

        const oLeft = obs.x
        const oRight = obs.x + obs.width
        const oTop = 270 - obs.height
        const oBottom = 270

        if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
          state.gameOver = true
          setGameState('gameover')
          break
        }

        // Delete off-screen obstacles
        if (obs.x < -obs.width) {
          state.obstacles.splice(i, 1)
        }
      }

      // Render Loop Graphics
      ctx.clearRect(0, 0, 600, 300)

      // Draw Grid Background lines
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.04)'
      ctx.lineWidth = 1
      const spacing = 30
      // Horizontal grid
      for (let y = 0; y < 300; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(600, y)
        ctx.stroke()
      }
      // Vertical grid moving backwards
      const offsetX = (elapsed * (state.speed / 20)) % spacing
      for (let x = -offsetX; x < 600; x += spacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 300)
        ctx.stroke()
      }

      // Draw Road Floor
      ctx.strokeStyle = '#c084fc'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, 270)
      ctx.lineTo(600, 270)
      ctx.stroke()

      // Floor neon glow
      ctx.shadowBlur = 10
      ctx.shadowColor = '#c084fc'
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.3)'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(0, 271)
      ctx.lineTo(600, 271)
      ctx.stroke()
      ctx.shadowBlur = 0

      // Draw Player Cube
      ctx.shadowBlur = 12
      ctx.shadowColor = '#c084fc'
      ctx.fillStyle = '#7c3aed'
      ctx.fillRect(60, state.playerY, 32, 32)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(60, state.playerY, 32, 32)
      // Player eye/core
      ctx.fillStyle = '#fff'
      ctx.fillRect(71, state.playerY + 11, 10, 10)
      ctx.shadowBlur = 0

      // Draw Spikes
      state.obstacles.forEach((obs) => {
        ctx.shadowBlur = 10
        ctx.shadowColor = '#ef4444'
        ctx.fillStyle = '#b91c1c'
        ctx.strokeStyle = '#f87171'
        ctx.lineWidth = 2

        ctx.beginPath()
        ctx.moveTo(obs.x, 270)
        ctx.lineTo(obs.x + obs.width / 2, 270 - obs.height)
        ctx.lineTo(obs.x + obs.width, 270)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      })
      ctx.shadowBlur = 0

      // Speed HUD tag
      ctx.fillStyle = '#64748b'
      ctx.font = '10px monospace'
      ctx.fillText(`SPEED: ${state.speed.toFixed(1)}x`, 510, 290)

      if (!state.gameOver) {
        runnerAnimationFrameRef.current = requestAnimationFrame(loop)
      }
    }

    runnerAnimationFrameRef.current = requestAnimationFrame(loop)
  }

  // Authentic Swipe Carousel movements
  const switchGame = (game: GameType) => {
    setSelectedGame(game)
  }

  const nextGame = () => {
    setSelectedGame('neon_runner')
  }

  const prevGame = () => {
    setSelectedGame('tap_speeder')
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    if (diff > 50) {
      nextGame()
    } else if (diff < -50) {
      prevGame()
    }
  }

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)

    const url = authMode === 'register' 
      ? `${API_URL}/api/auth/register` 
      : `${API_URL}/api/auth/login`

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

  const handleGuestPlay = () => {
    setLoadingGuest(true)
    setAuthError(null)
    fetch(`${API_URL}/api/auth/guest`, {
      method: 'POST'
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to start guest session')
        return data
      })
      .then((data) => {
        localStorage.setItem('token', data.token)
        localStorage.setItem('username', data.username)
        localStorage.setItem('countryCode', data.countryCode)
        setAuthToken(data.token)
        setCurrentUser(data.username)
        setUserCountry(data.countryCode)
        setLoadingGuest(false)
      })
      .catch((err) => {
        setAuthError(err.message || 'Error starting guest session.')
        setLoadingGuest(false)
      })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('countryCode')
    setAuthToken(null)
    setCurrentUser(null)
    setUserCountry(null)
    setStats(null)
    setGameState('idle')
    if (runnerAnimationFrameRef.current) {
      cancelAnimationFrame(runnerAnimationFrameRef.current)
    }
  }

  const handleSubmitScore = (finalScore: number, gameName: GameType) => {
    if (!authToken) return

    setSubmitting(true)
    setSubmitError(null)
    setSubmitted(false)

    fetch(`${API_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        score: finalScore,
        game: gameName
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
        fetchLeaderboard(gameName)
        fetchPersonalStats(authToken, gameName)
      })
      .catch((err) => {
        setSubmitError(err.message || 'Error submitting score.')
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
          
          {/* Centered non-overlapping status badge */}
          <div className="status-badge-container">
            {backendStatus ? (
              <span className="badge success-micro">
                <span className="dot pulse"></span> API ONLINE
              </span>
            ) : (
              <span className="badge danger-micro">
                <span className="dot"></span> API OFFLINE
              </span>
            )}
          </div>

          {/* Swipeable Horizontal Header Selector */}
          <div 
            className="game-header-carousel"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button className="carousel-arrow left" onClick={prevGame} title="Previous Game">
              ‹
            </button>
            
            <div className="carousel-viewport">
              <div 
                className="carousel-track"
                style={{ transform: `translateX(${selectedGame === 'tap_speeder' ? '0%' : '-50%'})` }}
              >
                <div className="carousel-item">
                  <h1 className="title-glowing">NEON TAP SPEEDER</h1>
                  <p className="subtitle">Tap the glowing cores before time runs out!</p>
                </div>
                
                <div className="carousel-item">
                  <h1 className="title-glowing">NEON RUNNER</h1>
                  <p className="subtitle">Jump over spikes and run as far as you can!</p>
                </div>
              </div>
            </div>

            <button className="carousel-arrow right" onClick={nextGame} title="Next Game">
              ›
            </button>
          </div>

          {/* Swipe indicator dots */}
          <div className="carousel-indicators">
            <span 
              className={`indicator-dot ${selectedGame === 'tap_speeder' ? 'active' : ''}`} 
              onClick={() => switchGame('tap_speeder')}
            ></span>
            <span 
              className={`indicator-dot ${selectedGame === 'neon_runner' ? 'active' : ''}`} 
              onClick={() => switchGame('neon_runner')}
            ></span>
          </div>

          <div className="carousel-swipe-label">
            ‹ Swipe or Scroll Header to Switch Game ›
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

                <div className="auth-divider">
                  <span className="divider-line"></span>
                  <span className="divider-text">OR</span>
                  <span className="divider-line"></span>
                </div>

                <button 
                  type="button" 
                  className="btn-secondary-action auth-guest-btn" 
                  onClick={handleGuestPlay}
                  disabled={loadingGuest}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  {loadingGuest ? 'CREATING GUEST SESSION...' : '⚡ PLAY AS GUEST'}
                </button>
              </form>
            </div>
          ) : (
            /* Game Interface for Logged-in Users */
            <div className="game-wrapper">
              
              <div className="user-profile-bar">
                <span>
                  ⚡ Speeder: {userCountry && <span className="profile-flag" title={userCountry} style={{ marginRight: '6px' }}>{getFlagEmoji(userCountry)}</span>}
                  <strong className="user-glow">{currentUser}</strong>
                </span>
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

                  <div className="intro-icon" style={{ marginTop: stats ? '15px' : '30px' }}>
                    {selectedGame === 'tap_speeder' ? '🎯' : '🏃'}
                  </div>
                  
                  <h2>{selectedGame === 'tap_speeder' ? 'Ready to test your speed?' : 'Endless Neon Survival'}</h2>
                  
                  <p>
                    {selectedGame === 'tap_speeder' 
                      ? 'You have 30 seconds to tap the moving target. Each tap shifts it randomly.'
                      : 'Tap, click, or press Space/Up to jump over incoming red spikes. Difficulty increases over time!'}
                  </p>
                  
                  <button className="btn-primary" onClick={startGame}>
                    START GAME
                  </button>
                </div>
              )}

              {gameState !== 'idle' && (
                <div className="game-screen-play">
                  <div className="hud">
                    {selectedGame === 'tap_speeder' ? (
                      <div className="hud-item">
                        <span className="hud-label">TIME LEFT</span>
                        <span className="hud-val highlight">{timeLeft}s</span>
                      </div>
                    ) : (
                      <div className="hud-item">
                        <span className="hud-label">MULTIPLIER</span>
                        <span className="hud-val highlight">x{(Math.floor(score / 10) + 1)}</span>
                      </div>
                    )}
                    
                    <div className="hud-item">
                      <span className="hud-label">CURRENT SCORE</span>
                      <span className="hud-val">{score}</span>
                    </div>
                  </div>

                  <div className="game-play-area-container">
                    {selectedGame === 'tap_speeder' ? (
                      <div className="game-area" ref={gameAreaRef}>
                        <button
                          className="game-target"
                          style={{ 
                            left: `${targetPosition.x}px`, 
                            top: `${targetPosition.y}px`,
                            pointerEvents: gameState === 'playing' ? 'auto' : 'none'
                          }}
                          onClick={handleTargetClick}
                          aria-label="Click target"
                        >
                          <span className="core-glow"></span>
                        </button>
                      </div>
                    ) : (
                      <div className="game-area runner-game-area" ref={gameAreaRef}>
                        <canvas
                          ref={runnerCanvasRef}
                          width={600}
                          height={300}
                          onClick={handleRunnerJump}
                          onTouchStart={handleRunnerJump}
                          style={{ display: 'block', width: '100%', height: '100%' }}
                        />
                      </div>
                    )}

                    {/* Accidental Click Blocker Overlay over Game Area */}
                    {gameState === 'gameover' && (
                      <div className="game-over-overlay">
                        <div className="game-over-neon">GAME OVER</div>
                        <div className="game-over-score">SCORE: {score}</div>
                        
                        {authToken && (
                          <div className="save-status-msg">
                            {submitting && <span className="auto-saving">⚡ Automatically saving score...</span>}
                            {submitted && <span className="save-success">🎉 Score submitted!</span>}
                            {submitError && <span className="save-error">❌ {submitError}</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions placed safely below the tap zones to prevent accidental clicks */}
                  {gameState === 'gameover' && (
                    <div className="gameover-actions-bar">
                      <button className="btn-primary play-again-btn" onClick={startGame}>
                        PLAY AGAIN
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}
        </div>

        {/* Right Side: Global Leaderboard */}
        <div className="leaderboard-section">
          <div className="leaderboard-header">
            <h3>{selectedGame === 'tap_speeder' ? 'SPEEDER RANKINGS' : 'RUNNER RANKINGS'}</h3>
            <button className="btn-refresh" onClick={() => fetchLeaderboard(selectedGame)} title="Refresh rankings">
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
                      <span className="username">
                        <span className="leaderboard-flag" title={entry.countryCode} style={{ marginRight: '6px' }}>{getFlagEmoji(entry.countryCode)}</span>
                        {entry.username}
                      </span>
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
