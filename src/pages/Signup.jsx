import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, USERNAME_RE } from '../lib/supabase'
import { COUNTRIES } from '../lib/countries'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    username: '',
    gender: '',
    dob: '',
    country: '',
    city: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const username = form.username.trim().toLowerCase()

    if (!USERNAME_RE.test(username)) {
      setError('Username must be 3–20 characters: lowercase letters, numbers or underscore.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const { data: available, error: rpcError } = await supabase.rpc('username_available', {
        candidate: username,
      })
      if (rpcError) throw rpcError
      if (!available) {
        setError('That username is already taken.')
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            username,
            gender: form.gender,
            dob: form.dob,
            country: form.country,
            city: form.city.trim(),
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })
      if (signUpError) {
        // The profile trigger rejects duplicate usernames at the database level too.
        if (/database error/i.test(signUpError.message)) {
          setError('Could not create the account — the username may have just been taken.')
        } else {
          setError(signUpError.message)
        }
        return
      }
      if (data.session) {
        navigate('/dashboard')
      } else {
        navigate(`/verify?email=${encodeURIComponent(form.email.trim())}`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card narrow">
      <h1>Create your account</h1>
      <p className="muted">
        Your username becomes part of every portfolio URL you publish, e.g.{' '}
        <code>/{form.username.trim().toLowerCase() || 'username'}-4821</code>
      </p>
      <form onSubmit={onSubmit} className="form">
        <label className="field">
          <span>Email</span>
          <input type="email" required value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span>Username</span>
          <input
            type="text"
            required
            placeholder="lowercase, 3–20 chars"
            value={form.username}
            onChange={set('username')}
          />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>Gender</span>
            <select required value={form.gender} onChange={set('gender')}>
              <option value="" disabled>Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label className="field">
            <span>Date of birth</span>
            <input
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={form.dob}
              onChange={set('dob')}
            />
          </label>
          <label className="field">
            <span>Country of residence</span>
            <select required value={form.country} onChange={set('country')}>
              <option value="" disabled>Select…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>City</span>
            <input type="text" required value={form.city} onChange={set('city')} />
          </label>
        </div>
        <label className="field">
          <span>Password</span>
          <input type="password" required value={form.password} onChange={set('password')} />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input type="password" required value={form.confirm} onChange={set('confirm')} />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
