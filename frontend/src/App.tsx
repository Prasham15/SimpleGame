import { useState, useEffect } from 'react'
import './App.css'

interface StatusResponse {
  status: string
  message: string
}

function App() {
  const [backendStatus, setBackendStatus] = useState<StatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchStatus = () => {
      fetch('http://localhost:8080/api/status')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }
          return res.json()
        })
        .then((data: StatusResponse) => {
          setBackendStatus(data)
          setError(null)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message || 'Could not connect to the backend server.')
          setBackendStatus(null)
          setLoading(false)
        })
    }

    fetchStatus()
    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-container">
      <div className="glass-card">
        <div className="card-header">
          <div className="title-glowing">GLOBAL LEADERBOARD GAME</div>
          <div className="subtitle">Phase 0: Environment & Connection Verification</div>
        </div>

        <div className="status-section">
          <div className="status-card">
            <h3>Frontend Application</h3>
            <div className="badge success">
              <span className="dot pulse"></span> RUNNING LOCALLY
            </div>
            <p className="details">Port: 5173 (React + Vite + TS)</p>
          </div>

          <div className="status-card">
            <h3>Backend Application</h3>
            {loading ? (
              <div className="badge warning">
                <span className="dot pulse"></span> CONNECTING...
              </div>
            ) : backendStatus ? (
              <div className="badge success">
                <span className="dot pulse"></span> {backendStatus.status}
              </div>
            ) : (
              <div className="badge danger">
                <span className="dot"></span> DISCONNECTED
              </div>
            )}
            <p className="details">Port: 8080 (Kotlin + Spring Boot)</p>
          </div>

          <div className="status-card">
            <h3>Database Cluster</h3>
            {loading ? (
              <div className="badge warning">
                <span className="dot pulse"></span> CHECKING...
              </div>
            ) : backendStatus ? (
              <div className="badge success">
                <span className="dot pulse"></span> CONNECTED
              </div>
            ) : (
              <div className="badge danger">
                <span className="dot"></span> OFFLINE
              </div>
            )}
            <p className="details">Port: 5432 (PostgreSQL 15)</p>
          </div>
        </div>

        <div className="message-box">
          {loading ? (
            <p className="loading-text">Pinging backend services...</p>
          ) : backendStatus ? (
            <div className="success-message">
              <h4>System Success Check!</h4>
              <p>{backendStatus.message}</p>
            </div>
          ) : (
            <div className="error-message">
              <h4>Connection Failure</h4>
              <p>{error}</p>
              <span className="retry-tip">Ensure backend is running on port 8080 and postgres-db is started on 5432.</span>
            </div>
          )}
        </div>

        <div className="footer-actions">
          <p className="info-txt">Setup is ready. Once verified, we will proceed to Phase 1: Basic Game.</p>
        </div>
      </div>
    </div>
  )
}

export default App
