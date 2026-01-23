export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
};

export type PatientRequest = {
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
  registeredDate?: string;
};

// Billing types (returned from patient-service after gRPC call to billing-service)
export type BillingAccount = {
  accountId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt?: string;
};

// Analytics event types (consumed by analytics-service via Kafka)
export type PatientEvent = {
  patientId: string;
  name: string;
  email: string;
  eventType: 'PATIENT_CREATED' | 'PATIENT_UPDATED' | 'PATIENT_DELETED';
  timestamp?: string;
};

// System health/status
export type ServiceHealth = {
  name: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  port: number;
  type: 'REST' | 'gRPC' | 'Kafka';
};

// Payment types (Stripe integration)
export type CreatePaymentRequest = {
  patientId: string;
  patientName: string;
  patientEmail: string;
  amount: number;
  currency: string;
  description?: string;
};

export type PaymentIntentResponse = {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
};

export type PaymentResponse = {
  paymentId: string;
  patientId: string;
  status: string;
  amount: number;
  currency: string;
  receiptUrl?: string;
};

export type Payment = {
  id: string;
  patientId: string;
  patientName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  createdAt: string;
};

// Analytics types (Kafka events from analytics-service)
export type AnalyticsEvent = {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  eventType: string;
  timestamp: string;
};

export type AnalyticsSummary = {
  totalEvents: number;
  eventsByType: Record<string, number>;
  uniquePatients: number;
  eventsLastHour: number;
  eventsLast24Hours: number;
};

