import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/axiosClient.js';
import AppButton from '../components/AppButton.jsx';
import AppInput from '../components/AppInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login, isAuthenticated, mustChangePw, tokenReady, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (tokenReady && isAuthenticated && mustChangePw) {
    return <Navigate to="/change-password" replace />;
  }

  if (tokenReady && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login({ identifier: form.identifier.trim(), password: form.password });
      if (result.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-brand">
          <div className="login-brand__logo" aria-hidden="true">A</div>
          <p className="eyebrow">HRMS Employee</p>
          <h1>Sign in</h1>
          <p className="muted" style={{ marginTop: 6 }}>Arham Share Pvt Ltd</p>
        </div>
        <div className="app-card" style={{ padding: '24px 20px' }}>
        <form className="form-stack" onSubmit={handleSubmit}>
          <AppInput
            label="Employee Code / Username / Email"
            type="text"
            autoComplete="username"
            placeholder="e.g. 1369 or aadesh_bhaveshbhai_mehta"
            value={form.identifier}
            onChange={handleChange('identifier')}
            required
          />
          <AppInput
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange('password')}
            required
          />
          {(error || authError) ? <p className="alert alert--error">{error || authError}</p> : null}
          <AppButton type="submit" loading={loading}>Login</AppButton>
          <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
        </form>
        </div>
      </section>
    </main>
  );
}
