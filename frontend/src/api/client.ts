import { http } from './http';
import type { LoginRequest, LoginResponse, Patient, PatientRequest, ServiceHealth, CreatePaymentRequest, PaymentIntentResponse, PaymentResponse, AnalyticsEvent, AnalyticsSummary } from './types';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return http<LoginResponse>('/auth/login', { method: 'POST', json: payload, auth: false });
}

export async function validateToken(): Promise<void> {
  return http<void>('/auth/validate', { method: 'GET' });
}

export async function getPatients(): Promise<Patient[]> {
  return http<Patient[]>('/api/patients', { method: 'GET' });
}

export async function getPatient(id: string): Promise<Patient> {
  return http<Patient>(`/api/patients/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function createPatient(payload: PatientRequest): Promise<Patient> {
  return http<Patient>('/api/patients', { method: 'POST', json: payload });
}

export async function updatePatient(id: string, payload: PatientRequest): Promise<Patient> {
  return http<Patient>(`/api/patients/${encodeURIComponent(id)}`, { method: 'PUT', json: payload });
}

export async function deletePatient(id: string): Promise<void> {
  return http<void>(`/api/patients/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Payment APIs (Stripe via Billing Service)
export async function createPaymentIntent(payload: CreatePaymentRequest): Promise<PaymentIntentResponse> {
  return http<PaymentIntentResponse>('/api/billing/payments/create-intent', { method: 'POST', json: payload });
}

export async function getPaymentStatus(paymentIntentId: string): Promise<PaymentResponse> {
  return http<PaymentResponse>(`/api/billing/payments/${encodeURIComponent(paymentIntentId)}`, { method: 'GET' });
}

export async function cancelPayment(paymentIntentId: string): Promise<PaymentResponse> {
  return http<PaymentResponse>(`/api/billing/payments/${encodeURIComponent(paymentIntentId)}/cancel`, { method: 'POST' });
}

// Analytics APIs (Kafka events from Analytics Service)
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return http<AnalyticsSummary>('/api/analytics/summary', { method: 'GET' });
}

export async function getAnalyticsEvents(limit: number = 50): Promise<AnalyticsEvent[]> {
  return http<AnalyticsEvent[]>(`/api/analytics/events?limit=${limit}`, { method: 'GET' });
}

export async function getEventsByPatient(patientId: string): Promise<AnalyticsEvent[]> {
  return http<AnalyticsEvent[]>(`/api/analytics/events/patient/${encodeURIComponent(patientId)}`, { method: 'GET' });
}

export async function getEventsByType(eventType: string): Promise<AnalyticsEvent[]> {
  return http<AnalyticsEvent[]>(`/api/analytics/events/type/${encodeURIComponent(eventType)}`, { method: 'GET' });
}

// Service health checks (direct calls to each service)
export async function checkServiceHealth(serviceName: string, port: number): Promise<ServiceHealth> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Try actuator health endpoint first (standard Spring Boot)
    const response = await fetch(`http://localhost:${port}/actuator/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      return {
        name: serviceName,
        status: 'UP',
        port,
        type: 'REST',
      };
    }

    return {
      name: serviceName,
      status: 'DOWN',
      port,
      type: 'REST',
    };
  } catch {
    return {
      name: serviceName,
      status: 'UNKNOWN',
      port,
      type: 'REST',
    };
  }
}

// Get all services health status
export async function getAllServicesHealth(): Promise<ServiceHealth[]> {
  const services = [
    { name: 'API Gateway', port: 4004, type: 'REST' as const },
    { name: 'Auth Service', port: 4005, type: 'REST' as const },
    { name: 'Patient Service', port: 4000, type: 'REST' as const },
    { name: 'Billing Service (HTTP)', port: 4001, type: 'REST' as const },
    { name: 'Billing Service (gRPC)', port: 9001, type: 'gRPC' as const },
    { name: 'Analytics Service', port: 4002, type: 'Kafka' as const },
  ];

  const results = await Promise.all(
    services.map(async (service) => {
      try {
        const health = await checkServiceHealth(service.name, service.port);
        return { ...health, type: service.type };
      } catch {
        return {
          name: service.name,
          status: 'UNKNOWN' as const,
          port: service.port,
          type: service.type,
        };
      }
    })
  );

  return results;
}
