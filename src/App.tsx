// ── Claude Analytics App ──

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SessionDetail from './pages/SessionDetail'
import Setup from './pages/Setup'
import FloatingParticles from './components/FloatingParticles'

function App() {
  return (
    <Router>
      <div className="app">
        <FloatingParticles />
        <Routes>
          {/* Setup page — full screen, no header */}
          <Route path="/setup" element={<Setup />} />

          {/* Main app with header */}
          <Route path="/*" element={
            <>
              <header className="header">
                <div className="header-content">
                  <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
                    <span className="logo-icon">CA</span>
                    <span>Claude Analytics</span>
                  </Link>
                  <nav className="nav">
                    <Link to="/" className="nav-link">대시보드</Link>
                    <Link to="/setup" className="nav-link">설정</Link>
                  </nav>
                </div>
              </header>
              <main className="main">
                <div className="container">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/session/:id" element={<SessionDetail />} />
                  </Routes>
                </div>
              </main>
              <footer className="footer">
                <p>Claude Analytics</p>
              </footer>
            </>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
