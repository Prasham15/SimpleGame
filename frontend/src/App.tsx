import { useState, useEffect, useRef } from 'react'
import './App.css'

interface StatusResponse {
  status: string
  message: string
}

type GameState = 'idle' | 'playing' | 'gameover'

function App() {
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  
  const timerRef = useRef<number | null>(null)
  const gameAreaRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch('http://localhost:8080/api/status')
      .then((res) => res.json())
      .then((data: StatusResponse) => setBackendStatus(data))
      .catch(() => setBackendStatus(null))
  }, [])

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
    setGameState('playing')
    // Wait a brief moment to ensure ref is attached
    setTimeout(moveTarget, 50)
  }

  const moveTarget = () => {
    if (!gameAreaRef.current) return
    const rect = gameAreaRef.current.getBoundingClientRect()
    // Target is 60px wide/high. Give padding so it stays inside
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

  return (
    <div className="app-container">
      <div className="glass-card">
        
        {/* Header containing status badge and title */}
        <div className="game-header">
          <div className="system-status">
            <span className="label">Database & Backend:</span>
            {backendStatus ? (
              <span className="badge success-micro">
                <span className="dot pulse"></span> CONNECTED
              </span>
            ) : (
              <span className="badge danger-micro">
                <span className="dot"></span> DISCONNECTED
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
              <div className="score-evaluation">
                {score < 15 ? '🐢 Warm up those fingers!' : score < 30 ? '⚡ Decent speed!' : '🔥 Fast as lightning!'}
              </div>
              <button className="btn-primary" onClick={startGame}>
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
