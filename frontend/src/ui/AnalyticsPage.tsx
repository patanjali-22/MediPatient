import { useQuery } from '@tanstack/react-query';
import * as api from '../api/client';
import type { AnalyticsEvent } from '../api/types';

export function AnalyticsPage() {
  // Fetch analytics summary from backend
  const summaryQuery = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: api.getAnalyticsSummary,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch recent events from backend
  const eventsQuery = useQuery({
    queryKey: ['analytics-events'],
    queryFn: () => api.getAnalyticsEvents(50),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const summary = summaryQuery.data;
  const events = eventsQuery.data ?? [];
  const isLoading = summaryQuery.isLoading || eventsQuery.isLoading;
  const hasError = summaryQuery.isError || eventsQuery.isError;

  return (
    <div className="stack">
      <h1>Analytics Service</h1>
      <p className="muted">Kafka-based event consumer (port 4002) - Real-time data from backend</p>

      <div className="panel info-panel">
        <h3>How Analytics Works</h3>
        <p>
          <strong>1. Patient Service</strong> publishes events to <strong>Kafka topic "patient"</strong><br/>
          <strong>2. Analytics Service</strong> consumes events via <code>@KafkaListener</code><br/>
          <strong>3. Events are stored</strong> and exposed via REST API<br/>
          <strong>4. Frontend fetches</strong> real-time data every 5 seconds
        </p>
        <pre className="code-block">{`// KafkaConsumer.java
@KafkaListener(topics = "patient", groupId = "analytics-service")
public void consumeEvent(byte[] event) {
    PatientEvent patientEvent = PatientEvent.parseFrom(event);
    analyticsService.recordEvent(patientEvent);
}`}</pre>
      </div>

      {/* Stats from real backend data */}
      <div className="stats-grid small">
        <div className="stat-card">
          <div className="stat-value">{summary?.totalEvents ?? 0}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary?.uniquePatients ?? 0}</div>
          <div className="stat-label">Unique Patients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary?.eventsLastHour ?? 0}</div>
          <div className="stat-label">Last Hour</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary?.eventsLast24Hours ?? 0}</div>
          <div className="stat-label">Last 24 Hours</div>
        </div>
      </div>

      {/* Events by Type */}
      {summary?.eventsByType && Object.keys(summary.eventsByType).length > 0 && (
        <div className="panel">
          <h2>Events by Type</h2>
          <div className="event-type-grid">
            {Object.entries(summary.eventsByType).map(([type, count]) => (
              <div key={type} className="event-type-card">
                <span className={`badge ${type === 'PATIENT_CREATED' ? 'success' : type === 'PATIENT_UPDATED' ? 'info' : 'warning'}`}>
                  {type}
                </span>
                <span className="event-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kafka Events Log */}
      <div className="panel">
        <h2>Kafka Events Log (Real-time)</h2>
        <p className="muted">Events consumed from Kafka topic "patient" - auto-refreshes every 5s</p>

        {isLoading && <div>Loading events from Analytics Service...</div>}
        {hasError && (
          <div className="error-box">
            <p>Could not fetch events from Analytics Service.</p>
            <p className="muted">Make sure the service is running on port 4002 and connected to Kafka.</p>
          </div>
        )}

        {!isLoading && !hasError && events.length === 0 ? (
          <p className="muted">No events yet. Create a patient to publish a Kafka event.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Timestamp</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e: AnalyticsEvent) => (
                <tr key={e.id}>
                  <td>
                    <span className={`badge ${e.eventType === 'PATIENT_CREATED' ? 'success' : e.eventType === 'PATIENT_UPDATED' ? 'info' : 'warning'}`}>
                      {e.eventType}
                    </span>
                  </td>
                  <td><code>{e.patientId.substring(0, 8)}...</code></td>
                  <td>{e.patientName}</td>
                  <td>{e.patientEmail}</td>
                  <td>{new Date(e.timestamp).toLocaleString()}</td>
                  <td><span className="badge kafka">Kafka</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Architecture */}
      <div className="panel">
        <h2>Kafka Integration Architecture</h2>
        <div className="kafka-flow">
          <div className="kafka-box">
            <div className="kafka-title">Patient Service</div>
            <div className="kafka-port">:4000</div>
            <div className="kafka-role">Producer</div>
          </div>
          <div className="kafka-arrow">
            <div className="arrow-label">PatientEvent (Protobuf)</div>
            <div className="arrow-line">→</div>
          </div>
          <div className="kafka-box kafka-broker">
            <div className="kafka-title">Kafka</div>
            <div className="kafka-port">topic: "patient"</div>
            <div className="kafka-role">Message Broker</div>
          </div>
          <div className="kafka-arrow">
            <div className="arrow-label">@KafkaListener</div>
            <div className="arrow-line">→</div>
          </div>
          <div className="kafka-box">
            <div className="kafka-title">Analytics Service</div>
            <div className="kafka-port">:4002</div>
            <div className="kafka-role">Consumer</div>
          </div>
        </div>
      </div>
    </div>
  );
}
