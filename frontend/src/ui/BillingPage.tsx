import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../api/client';
import type { Patient, BillingAccount, Payment } from '../api/types';
import { PaymentModal } from './components/PaymentModal';

function generateBillingAccounts(patients: Patient[]): BillingAccount[] {
  return patients.map((patient, index) => ({
    accountId: `ACC-${(10000 + index).toString()}`,
    patientId: patient.id,
    patientName: patient.name,
    patientEmail: patient.email,
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
  }));
}


export function BillingPage() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: api.getPatients,
  });

  const patients = patientsQuery.data ?? [];
  const billingAccounts = generateBillingAccounts(patients);
  const activeAccounts = billingAccounts.filter(a => a.status === 'ACTIVE').length;

  const handlePaymentSuccess = () => {
    // Add a mock payment record (in real app, refetch from backend)
    if (selectedPatient) {
      const newPayment: Payment = {
        id: `PAY-${Date.now()}`,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        amount: 10000, // $100.00 in cents
        currency: 'usd',
        status: 'succeeded',
        createdAt: new Date().toISOString(),
      };
      setPayments(prev => [newPayment, ...prev]);
    }
    setSelectedPatient(null);
  };

  return (
    <div className="stack">
      <h1>Billing Service</h1>
      <p className="muted">gRPC-based billing + Stripe payment integration</p>

      <div className="panel info-panel">
        <h3>How Billing & Payments Work</h3>
        <p>
          <strong>1. Billing Account:</strong> Auto-created via gRPC when patient is registered.<br/>
          <strong>2. Payments:</strong> Processed via Stripe API (Payment Intents).
        </p>
        <pre className="code-block">{`// Flow: Frontend → API Gateway → Billing Service → Stripe API
POST /api/billing/payments/create-intent
  → Creates Stripe PaymentIntent
  → Returns clientSecret for frontend confirmation`}</pre>
      </div>

      <div className="stats-grid small">
        <div className="stat-card">
          <div className="stat-value">{billingAccounts.length}</div>
          <div className="stat-label">Billing Accounts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value success">{activeAccounts}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{payments.length}</div>
          <div className="stat-label">Payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            ${payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0) / 100}
          </div>
          <div className="stat-label">Revenue</div>
        </div>
      </div>

      {/* Process Payment Section */}
      <div className="panel">
        <h2>Process Payment</h2>
        <p className="muted">Select a patient to process a payment via Stripe</p>
        {patients.length === 0 ? (
          <p className="muted">No patients available. Create a patient first.</p>
        ) : (
          <div className="patient-payment-grid">
            {patients.map((patient) => (
              <div key={patient.id} className="patient-payment-card">
                <div className="patient-info">
                  <strong>{patient.name}</strong>
                  <span className="muted">{patient.email}</span>
                </div>
                <button
                  className="btn primary"
                  onClick={() => setSelectedPatient(patient)}
                >
                  Pay
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="panel">
        <h2>Recent Payments</h2>
        {payments.length === 0 ? (
          <p className="muted">No payments yet. Process a payment to see it here.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Patient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td><code>{payment.id}</code></td>
                  <td>{payment.patientName}</td>
                  <td>${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}</td>
                  <td>
                    <span className={`badge ${payment.status === 'succeeded' ? 'success' : payment.status === 'pending' ? 'warning' : 'danger'}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Billing Accounts */}
      <div className="panel">
        <h2>Billing Accounts (via gRPC)</h2>
        {patientsQuery.isLoading && <div>Loading...</div>}
        {billingAccounts.length === 0 ? (
          <p className="muted">No accounts yet. Create a patient to auto-generate one via gRPC.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>Patient</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created Via</th>
              </tr>
            </thead>
            <tbody>
              {billingAccounts.map((a) => (
                <tr key={a.accountId}>
                  <td><code>{a.accountId}</code></td>
                  <td>{a.patientName}</td>
                  <td>{a.patientEmail}</td>
                  <td><span className="badge success">{a.status}</span></td>
                  <td><span className="badge grpc">gRPC</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Modal */}
      {selectedPatient && (
        <PaymentModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
