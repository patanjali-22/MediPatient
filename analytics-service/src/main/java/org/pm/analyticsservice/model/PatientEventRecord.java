package org.pm.analyticsservice.model;

import java.time.LocalDateTime;

public class PatientEventRecord {
    private String id;
    private String patientId;
    private String patientName;
    private String patientEmail;
    private String eventType;
    private LocalDateTime timestamp;

    public PatientEventRecord() {}

    public PatientEventRecord(String id, String patientId, String patientName,
                               String patientEmail, String eventType, LocalDateTime timestamp) {
        this.id = id;
        this.patientId = patientId;
        this.patientName = patientName;
        this.patientEmail = patientEmail;
        this.eventType = eventType;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientEmail() { return patientEmail; }
    public void setPatientEmail(String patientEmail) { this.patientEmail = patientEmail; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
