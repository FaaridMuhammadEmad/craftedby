import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isConfigured } from '../lib/supabase'

const PRICING_SEEN_KEY = 'craftedby-pricing-notice-dismissed'

function PricingNotice({ session }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(PRICING_SEEN_KEY) === '1'
  )
  if (!session || dismissed) return null
  const close = () => {
    localStorage.setItem(PRICING_SEEN_KEY, '1')
    setDismissed(true)
  }
  return (
    <div className="pricing-banner" role="status">
      <span>
        <strong>Early access:</strong> craftedBy is free until <strong>15 August 2026</strong> —
        after that, $10 / month.
      </span>
      <button className="banner-close" onClick={close} aria-label="Dismiss notice">
        ✕
      </button>
    </div>
  )
}

function ConfigNotice() {
  if (isConfigured) return null
  return (
    <div className="config-notice">
      Backend not connected yet — set <code>VITE_SUPABASE_URL</code> and{' '}
      <code>VITE_SUPABASE_ANON_KEY</code> (see SETUP.md). Template previews still work.
    </div>
  )
}

export default function Shell() {
  const { session, profile, signOut } = useAuth()

  return (
    <div className="app">
      <header className="nav">
        <Link to="/" className="brand">
          crafted<span className="brand-accent">By</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/templates">Templates</NavLink>
          {session && <NavLink to="/dashboard">My portfolios</NavLink>}
          {session && <NavLink to="/resume">Résumé</NavLink>}
        </nav>
        <div className="nav-auth">
          {session ? (
            <>
              <span className="nav-user">@{profile?.username || '…'}</span>
              <button className="btn-ghost-sm" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="btn-ghost-sm" to="/login">
                Log in
              </Link>
              <Link className="btn-primary-sm" to="/signup">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
      <ConfigNotice />
      <PricingNotice session={session} />
      <main className="page">
        <Outlet />
      </main>
      <footer className="app-foot">
        craftedBy · portfolios, crafted by you · v{import.meta.env.VITE_APP_VERSION}
      </footer>
    </div>
  )
}
