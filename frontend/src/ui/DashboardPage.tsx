import { useQuery } from '@tanstack/react-query';
import * as api from '../api/client';

export function DashboardPage() {
  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: api.getPatients,
  });

  const patients = patientsQuery.data ?? [];
  const totalPatients = patients.length;

  return (
    <div className="stack">
      <h1>Dashboard</h1>
      <p className="muted">System overview and microservices status</p>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon patients">👥</div>
          <div className="stat-content">
            <div className="stat-value">{totalPatients}</div>
            <div className="stat-label">Total Patients</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon billing">💳</div>
          <div className="stat-content">
            <div className="stat-value">{totalPatients}</div>
            <div className="stat-label">Billing Accounts</div>
            <div className="stat-sub">Auto-created via gRPC</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon events">📊</div>
          <div className="stat-content">
            <div className="stat-value">{totalPatients}</div>
            <div className="stat-label">Kafka Events</div>
            <div className="stat-sub">PATIENT_CREATED events</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon services">🔌</div>
          <div className="stat-content">
            <div className="stat-value">5</div>
            <div className="stat-label">Active Services</div>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="panel">
        <h2>🏗️ Microservices Architecture</h2>
        <div className="architecture">
          <div className="arch-row">
            <div className="arch-box client">
              <div className="arch-title">Frontend (React)</div>
              <div className="arch-port">:5173</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-box gateway">
              <div className="arch-title">API Gateway</div>
              <div className="arch-port">:4004</div>
              <div className="arch-tech">Spring Cloud Gateway</div>
            </div>
          </div>

          <div className="arch-row services-row">
            <div className="arch-box service">
              <div className="arch-title">Auth Service</div>
              <div className="arch-port">:4005</div>
              <div className="arch-tech">JWT + PostgreSQL</div>
            </div>

            <div className="arch-box service primary">
              <div className="arch-title">Patient Service</div>
              <div className="arch-port">:4000</div>
              <div className="arch-tech">REST + JPA</div>
              <div className="arch-connections">
                <span className="conn grpc">gRPC →</span>
                <span className="conn kafka">Kafka →</span>
              </div>
            </div>

            <div className="arch-box service">
              <div className="arch-title">Billing Service</div>
              <div className="arch-port">:4001 / :9001</div>
              <div className="arch-tech">gRPC Server</div>
            </div>

            <div className="arch-box service">
              <div className="arch-title">Analytics Service</div>
              <div className="arch-port">:4002</div>
              <div className="arch-tech">Kafka Consumer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Flow */}
      <div className="panel">
        <h2>📈 Data Flow (when creating a patient)</h2>
        <div className="flow-steps">
          <div className="flow-step">
            <div className="step-num">1</div>
            <div className="step-content">
              <div className="step-title">Frontend → API Gateway</div>
              <div className="step-desc">POST /api/patients with JWT token</div>
            </div>
          </div>
          <div className="flow-step">
            <div className="step-num">2</div>
            <div className="step-content">
              <div className="step-title">Gateway validates JWT</div>
              <div className="step-desc">Calls Auth Service /validate endpoint</div>
            </div>
          </div>
          <div className="flow-step">
            <div className="step-num">3</div>
            <div className="step-content">
              <div className="step-title">Patient Service creates patient</div>
              <div className="step-desc">Saves to PostgreSQL database</div>
            </div>
          </div>
          <div className="flow-step highlight-grpc">
            <div className="step-num">4</div>
            <div className="step-content">
              <div className="step-title">gRPC → Billing Service</div>
              <div className="step-desc">CreateBillingAccount(patientId, name, email)</div>
              <div className="step-badge grpc">gRPC :9001</div>
            </div>
          </div>
          <div className="flow-step highlight-kafka">
            <div className="step-num">5</div>
            <div className="step-content">
              <div className="step-title">Kafka → Analytics Service</div>
              <div className="step-desc">PatientEvent published to "patient" topic</div>
              <div className="step-badge kafka">Kafka</div>
            </div>
          </div>
          <div className="flow-step">
            <div className="step-num">6</div>
            <div className="step-content">
              <div className="step-title">Response returned to Frontend</div>
              <div className="step-desc">Patient created with billing account ACTIVE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Patients */}
      <div className="panel">
        <h2>👥 Recent Patients</h2>
        {patientsQuery.isLoading ? <div>Loading...</div> : null}
        {patients.length === 0 ? (
          <p className="muted">No patients yet. Create one to see the microservices in action!</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Billing Status</th>
                <th>Kafka Event</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.email}</td>
                  <td><span className="badge success">ACTIVE</span></td>
                  <td><span className="badge info">PATIENT_CREATED</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
