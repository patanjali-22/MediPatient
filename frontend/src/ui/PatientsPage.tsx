import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';
import type { Patient, PatientRequest } from '../api/types';
import { PatientForm } from './components/PatientForm';

export function PatientsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Patient | null>(null);
  const [creating, setCreating] = useState(false);

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: api.getPatients,
  });

  const createMutation = useMutation({
    mutationFn: api.createPatient,
    onSuccess: async () => {
      setCreating(false);
      await qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatientRequest }) => api.updatePatient(id, payload),
    onSuccess: async () => {
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deletePatient,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);

  return (
    <div className="stack">
      <div className="row">
        <h1>Patients</h1>
        <div className="spacer" />
        <button className="btn primary" onClick={() => setCreating(true)}>
          New patient
        </button>
      </div>

      {patientsQuery.isLoading ? <div className="panel">Loading…</div> : null}
      {patientsQuery.isError ? (
        <div className="panel error">
          Failed to load patients. If you just logged in, try refresh. Otherwise check the gateway and token.
        </div>
      ) : null}

      {creating ? (
        <div className="panel">
          <h2>Create patient</h2>
          <PatientForm
            mode="create"
            onCancel={() => setCreating(false)}
            onSubmit={(payload) => createMutation.mutate(payload)}
            busy={createMutation.isPending}
          />
          {createMutation.isError ? <div className="error">Create failed.</div> : null}
        </div>
      ) : null}

      {editing ? (
        <div className="panel">
          <h2>Edit patient</h2>
          <PatientForm
            mode="edit"
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(payload) => updateMutation.mutate({ id: editing.id, payload })}
            busy={updateMutation.isPending}
          />
          {updateMutation.isError ? <div className="error">Update failed.</div> : null}
        </div>
      ) : null}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Address</th>
              <th>Date of Birth</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email}</td>
                <td>{p.address}</td>
                <td>{p.dateOfBirth}</td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn" onClick={() => setEditing(p)}>
                      Edit
                    </button>
                    <button
                      className="btn danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {patients.length === 0 && !patientsQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="muted">
                  No patients yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
