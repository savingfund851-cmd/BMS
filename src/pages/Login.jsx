import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Building2 } from 'lucide-react'
import { userStore, settingsStore, buildingStore, billStore, paymentStore } from '../data/store'
import { formatCurrency } from '../data/helpers'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({})
  
  // Ticker stats
  const [stats, setStats] = useState({ bCount: 0, bCollected: 0, bGen: 0 })
  
  const svgRef = useRef(null)
  const starsRef = useRef(null)

  useEffect(() => {
    const s = settingsStore.get() || {}
    setSettings(s)
    
    // Calculate stats for ticker
    const bldgs = buildingStore.getAll()
    const bls = billStore.getAll()
    const py = paymentStore.getAll()
    const col = py.reduce((sum, p) => sum + p.amount, 0)
    
    setStats({
      bCount: bldgs.length,
      bCollected: col,
      bGen: bls.length
    })

    const handler = () => {
      setSettings(settingsStore.get() || {})
    }
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [])

  // Initialize SVG Skyline and Stars
  useEffect(() => {
    if (!svgRef.current || !starsRef.current) return
    
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = svgRef.current
    
    // Clear previous elements if re-running
    while (svg.lastChild) {
      if (svg.lastChild.nodeName === 'defs') break; // Keep defs
      svg.removeChild(svg.lastChild)
    }

    function el(tag, attrs) {
      const e = document.createElementNS(svgNS, tag)
      for (const k in attrs) e.setAttribute(k, attrs[k])
      return e
    }

    const baseY = 900
    // back skyline
    const backG = el('g', { class: 'bld-back' })
    svg.appendChild(backG)
    const backBlds = [
      {x:20,w:110,h:230},{x:150,w:90,h:180},{x:260,w:130,h:290},{x:410,w:100,h:210},
      {x:900,w:120,h:250},{x:1040,w:95,h:190},{x:1170,w:150,h:310},{x:1350,w:110,h:230},{x:1490,w:100,h:190}
    ]
    backBlds.forEach(b => {
      backG.appendChild(el('rect', { x:b.x, y:baseY-b.h, width:b.w, height:b.h, fill:'#0a0e1a', opacity: 0.5 }))
    })

    // front skyline
    const frontG = el('g', {})
    svg.appendChild(frontG)
    const buildings = [
      {x:40,w:130,h:400},{x:200,w:150,h:540},{x:380,w:120,h:460},{x:530,w:165,h:600},
      {x:730,w:130,h:480},{x:890,w:145,h:560},{x:1070,w:110,h:380},{x:1220,w:90,h:300},{x:1380,w:80,h:250}
    ]
    buildings.forEach(b => {
      frontG.appendChild(el('rect', { x:b.x, y:baseY-b.h, width:b.w, height:b.h, fill:'#0c1220', stroke:'#1c2740', 'stroke-width':1 }))
      const cols = Math.max(2, Math.round(b.w/24))
      const rows = Math.max(3, Math.round(b.h/34))
      const cw = b.w/cols, rh = b.h/rows
      for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
          const isOn = Math.random() > 0.4
          const wc = Math.random() > 0.82 ? '#14b8a6' : '#10b981' // teal or emerald
          const rect = el('rect', {
            x: b.x + c*cw + cw*0.22,
            y: baseY-b.h + r*rh + rh*0.28,
            width: cw*0.56, height: rh*0.44,
            class: 'win' + (isOn ? ' on' : ''),
            style: '--wc:' + wc
          })
          rect.style.animationDelay = (Math.random()*4) + 's'
          frontG.appendChild(rect)
        }
      }
    })

    // Hub + Lines
    const hub = { x:1420, y:430 }
    svg.appendChild(el('circle', { cx:hub.x, cy:hub.y, r:170, class:'hub-glow-static' }))

    const sources = [
      {x:105, y:baseY-400}, {x:275, y:baseY-540}, {x:440, y:baseY-460},
      {x:612, y:baseY-600}, {x:795, y:baseY-480}, {x:962, y:baseY-560}
    ]
    sources.forEach((s, i) => {
      const midX = (s.x + hub.x) / 2
      const midY = Math.min(s.y, hub.y) - 60 - i*8
      const d = `M ${s.x} ${s.y} Q ${midX} ${midY} ${hub.x} ${hub.y}`
      const path = el('path', { d:d, class:'hub-line' })
      svg.appendChild(path)

      const dot = el('circle', { r:4, fill:i%2===0 ? '#10b981' : '#14b8a6' })
      dot.style.filter = 'drop-shadow(0 0 5px currentColor)'
      const anim = el('animateMotion', { dur:(3.4+i*0.4)+'s', repeatCount:'indefinite', path:d, begin:(i*0.5)+'s' })
      dot.appendChild(anim)
      svg.appendChild(dot)
    })

    // Stars
    const starsWrap = starsRef.current
    starsWrap.innerHTML = ''
    const frag = document.createDocumentFragment()
    for (let i=0; i<70; i++) {
      const s = document.createElement('div')
      s.className = 'star'
      const size = Math.random()*1.8 + 0.6
      s.style.width = size+'px'
      s.style.height = size+'px'
      s.style.left = (Math.random()*100)+'%'
      s.style.top = (Math.random()*55)+'%'
      s.style.animationDelay = (Math.random()*3.5)+'s'
      frag.appendChild(s)
    }
    starsWrap.appendChild(frag)

    // Parallax
    const handleMouseMove = (e) => {
      const relX = (e.clientX / window.innerWidth - 0.5)
      const relY = (e.clientY / window.innerHeight - 0.5)
      backG.setAttribute('transform', `translate(${relX*10} ${relY*5})`)
      frontG.setAttribute('transform', `translate(${relX*20} ${relY*8})`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await userStore.authenticate(username, password)
      if (user) {
        // slight delay to show loading animation before redirect
        setTimeout(() => {
          onLogin(user)
        }, 600)
      } else {
        setError('Invalid username or password')
        setLoading(false)
      }
    } catch (err) {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="login-app">
      <div className="ticker">
        <div className="ticker-track">
          {[...Array(2)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '48px', paddingRight: '48px' }}>
              <span>🏢 <b>{stats.bCount}</b> buildings connected</span>
              <span>⚡ {settings.loginTickerText || 'Live meter sync active'}</span>
              <span>💳 <b>{formatCurrency(stats.bCollected)}</b> collected</span>
              <span>📄 <b>{stats.bGen}</b> bills generated</span>
              <span>✅ <b>Secure</b> encrypted portal</span>
            </div>
          ))}
        </div>
      </div>

      <div id="stars" ref={starsRef}></div>

      <div className="skyline-wrap">
        <svg id="skylineSvg" ref={svgRef} viewBox="0 0 1600 900" preserveAspectRatio="none">
          <defs>
            <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-emerald)" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="var(--color-emerald)" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-emerald)" stopOpacity="0"/>
              <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0.9"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="login-card-wrap">
        <div className="login-card">
          <div className="hub-icon">
            <div className="ring">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: '4px', zIndex: 2, position: 'relative' }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ zIndex: 2, position: 'relative' }}>
                  <circle cx="12" cy="12" r="2.5"/><circle cx="4" cy="5" r="1.8"/>
                  <circle cx="20" cy="5" r="1.8"/><circle cx="4" cy="19" r="1.8"/>
                  <circle cx="20" cy="19" r="1.8"/>
                  <path d="M6 6.3 10.2 10.5M13.8 10.5 18 6.3M6 17.7l4.2-4.2M13.8 13.5 18 17.7"/>
                </svg>
              )}
            </div>
          </div>

          <div className="brand-title">
            <div className="l1 display">{settings.companyName || 'RentFlow'}</div>
            <div className="l2">{settings.companyTagline || 'Control Hub'}</div>
          </div>

          <div className="welcome">
            <h2>Sign in to your hub</h2>
            <p>Monitor, bill, and manage every building from one place.</p>
          </div>

          <form className="login-form-new" onSubmit={handleSubmit}>
            {error && (
              <div style={{ color: 'var(--color-error)', fontSize: '13px', marginBottom: '12px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '6px' }}>
                {error}
              </div>
            )}
            <div className="field">
              <svg className="leading" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input 
                type="text" 
                placeholder="Username" 
                autoComplete="username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="field">
              <svg className="leading" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Password" 
                autoComplete="current-password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
              />
              <button type="button" className="toggle-eye" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>

            <div className="row-between">
              <label className="remember"><input type="checkbox" defaultChecked /> Remember Me</label>
              <span className="forgot" style={{ cursor: 'pointer' }} onClick={() => alert('Please contact Super Admin to reset your password.')}>Forgot Password?</span>
            </div>

            <button type="submit" className={`btn-login ${loading ? 'loading' : ''}`}>
              Sign In
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              <span className="spinner"></span>
            </button>
          </form>

          <p className="foot-note">Trusted by <b>{Math.max(120, stats.bCount)}</b> residential buildings</p>
        </div>
      </div>
    </div>
  )
}

export default Login
