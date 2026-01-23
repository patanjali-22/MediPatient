package org.pm.analyticsservice.controller;

import org.pm.analyticsservice.model.PatientEventRecord;
import org.pm.analyticsservice.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        return ResponseEntity.ok(analyticsService.getAnalyticsSummary());
    }

    @GetMapping("/events")
    public ResponseEntity<List<PatientEventRecord>> getAllEvents(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(analyticsService.getRecentEvents(limit));
    }

    @GetMapping("/events/patient/{patientId}")
    public ResponseEntity<List<PatientEventRecord>> getEventsByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(analyticsService.getEventsByPatientId(patientId));
    }

    @GetMapping("/events/type/{eventType}")
    public ResponseEntity<List<PatientEventRecord>> getEventsByType(
            @PathVariable String eventType) {
        return ResponseEntity.ok(analyticsService.getEventsByType(eventType));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "analytics-service",
                "kafka", "CONNECTED"
        ));
    }
}
