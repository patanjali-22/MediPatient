import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useMutation } from '@tanstack/react-query';
import * as api from '../../api/client';
import type { Patient } from '../../api/types';

// Initialize Stripe with your publishable key
// In production, load this from environment variable
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/billing?payment=success',
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement />
      {error && <div className="error">{error}</div>}
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button type="submit" disabled={!stripe || processing} className="btn primary">
          {processing ? 'Processing...' : 'Pay Now'}
        </button>
        <button type="button" onClick={onCancel} className="btn" disabled={processing}>
          Cancel
        </button>
      </div>
    </form>
  );
}

interface PaymentModalProps {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ patient, onClose, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState<string>('100.00');
  const [description, setDescription] = useState<string>('Medical consultation');
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const createIntentMutation = useMutation({
    mutationFn: api.createPaymentIntent,
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
  });

  const handleCreateIntent = () => {
    createIntentMutation.mutate({
      patientId: patient.id,
      patientName: patient.name,
      patientEmail: patient.email,
      amount: parseFloat(amount),
      currency: 'usd',
      description,
    });
  };

  const handlePaymentSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Process Payment</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="payment-patient-info">
            <p><strong>Patient:</strong> {patient.name}</p>
            <p><strong>Email:</strong> {patient.email}</p>
          </div>

          {!clientSecret ? (
            <div className="payment-setup">
              <div className="form">
                <label>
                  Amount (USD)
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0.50"
                    step="0.01"
                  />
                </label>
                <label>
                  Description
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>

              {createIntentMutation.isError && (
                <div className="error">Failed to create payment. Please try again.</div>
              )}

              <div className="row" style={{ marginTop: 16, gap: 8 }}>
                <button
                  onClick={handleCreateIntent}
                  className="btn primary"
                  disabled={createIntentMutation.isPending}
                >
                  {createIntentMutation.isPending ? 'Creating...' : 'Continue to Payment'}
                </button>
                <button onClick={onClose} className="btn">Cancel</button>
              </div>
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                onSuccess={handlePaymentSuccess}
                onCancel={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
