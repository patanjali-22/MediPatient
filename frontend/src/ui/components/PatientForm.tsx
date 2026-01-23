import { FormEvent, useMemo, useState } from 'react';
import type { Patient, PatientRequest } from '../../api/types';

export function PatientForm({
  mode,
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initial?: Patient;
  busy?: boolean;
  onSubmit: (payload: PatientRequest) => void;
  onCancel: () => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth ?? '');
  const [registeredDate, setRegisteredDate] = useState(today);

  function submit(e: FormEvent) {
    e.preventDefault();

    const payload: PatientRequest = {
      name,
      email,
      address,
      dateOfBirth,
    };

    // backend requires registeredDate only on create
    if (mode === 'create') payload.registeredDate = registeredDate;

    onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="form">
      <div className="grid">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </label>

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>

        <label className="colspan-2">
          Address
          <input value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>

        <label>
          Date of Birth
          <input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} type="date" required />
        </label>

        {mode === 'create' ? (
          <label>
            Registered Date
            <input
              value={registeredDate}
              onChange={(e) => setRegisteredDate(e.target.value)}
              type="date"
              required
            />
          </label>
        ) : (
          <div />
        )}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
