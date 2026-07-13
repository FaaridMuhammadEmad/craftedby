import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const email = params.get('email') || ''
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  // If the user clicked the email link instead of typing the code,
  // a session appears — just continue.
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      // Newer Supabase projects verify signup codes as type 'email',
      // older ones as type 'signup' — accept whichever works.
      let { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: 'signup',
      })
      if (otpError) {
        const retry = await supabase.auth.verifyOtp({
          email,
          token: token.trim(),
          type: 'email',
        })
        otpError = retry.error
      }
      if (otpError) {
        setError(otpError.message)
        return
      }
      navigate('/dashboard')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError('')
    setInfo('')
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
    if (resendError) setError(resendError.message)
    else setInfo('A new code is on its way. Check your inbox (and spam).')
  }

  return (
    <div className="card narrow">
      <h1>Verify your email</h1>
      <p className="muted">
        We sent a 6-digit code to <strong>{email || 'your email'}</strong>. Enter it below —
        or click the link in the email, either works.
      </p>
      <form onSubmit={onSubmit} className="form">
        <label className="field">
          <span>Verification code</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        {info && <div className="form-info">{info}</div>}
        <button className="btn-primary" disabled={busy || !email}>
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>
      <button className="btn-link" onClick={resend} disabled={!email}>
        Resend code
      </button>
    </div>
  )
}
