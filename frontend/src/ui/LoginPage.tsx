import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import * as api from '../api/client';
import { authStore } from './authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('testuser@test.com');
  const [password, setPassword] = useState('password123');

  const mutation = useMutation({
    mutationFn: api.login,
    onSuccess: (res) => {
      authStore.setToken(res.token);
      navigate('/patients');
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <div className="panel">
      <h1>Login</h1>
      <p className="muted">Use your Auth Service credentials to get a JWT.</p>

      <form onSubmit={onSubmit} className="form">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>

        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
          />
        </label>

        <button className="btn primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>

        {mutation.isError ? (
          <div className="error">Login failed. Check email/password and that the gateway is running.</div>
        ) : null}
      </form>
    </div>
  );
}
