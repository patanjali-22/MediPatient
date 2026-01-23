package org.pm.analyticsservice.service;

import org.pm.analyticsservice.model.PatientEventRecord;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    // In-memory store for events (in production, use a database)
    private final Deque<PatientEventRecord> eventStore = new ConcurrentLinkedDeque<>();

    // Keep last 1000 events
    private static final int MAX_EVENTS = 1000;

    public void recordEvent(String patientId, String patientName, String patientEmail, String eventType) {
        PatientEventRecord record = new PatientEventRecord(
                UUID.randomUUID().toString(),
                patientId,
                patientName,
                patientEmail,
                eventType,
                LocalDateTime.now()
        );

        eventStore.addFirst(record);

        // Trim if exceeds max
        while (eventStore.size() > MAX_EVENTS) {
            eventStore.removeLast();
        }
    }

    public List<PatientEventRecord> getRecentEvents(int limit) {
        return eventStore.stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    public List<PatientEventRecord> getAllEvents() {
        return new ArrayList<>(eventStore);
    }

    public Map<String, Object> getAnalyticsSummary() {
        Map<String, Object> summary = new HashMap<>();

        List<PatientEventRecord> events = getAllEvents();

        // Total events
        summary.put("totalEvents", events.size());

        // Events by type
        Map<String, Long> eventsByType = events.stream()
                .collect(Collectors.groupingBy(
                        PatientEventRecord::getEventType,
                        Collectors.counting()
                ));
        summary.put("eventsByType", eventsByType);

        // Unique patients
        long uniquePatients = events.stream()
                .map(PatientEventRecord::getPatientId)
                .distinct()
                .count();
        summary.put("uniquePatients", uniquePatients);

        // Events in last hour
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long eventsLastHour = events.stream()
                .filter(e -> e.getTimestamp().isAfter(oneHourAgo))
                .count();
        summary.put("eventsLastHour", eventsLastHour);

        // Events in last 24 hours
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
        long eventsLast24Hours = events.stream()
                .filter(e -> e.getTimestamp().isAfter(oneDayAgo))
                .count();
        summary.put("eventsLast24Hours", eventsLast24Hours);

        return summary;
    }

    public List<PatientEventRecord> getEventsByPatientId(String patientId) {
        return eventStore.stream()
                .filter(e -> e.getPatientId().equals(patientId))
                .collect(Collectors.toList());
    }

    public List<PatientEventRecord> getEventsByType(String eventType) {
        return eventStore.stream()
                .filter(e -> e.getEventType().equals(eventType))
                .collect(Collectors.toList());
    }
}
