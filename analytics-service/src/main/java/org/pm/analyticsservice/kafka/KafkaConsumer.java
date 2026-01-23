package org.pm.analyticsservice.kafka;

import com.google.protobuf.InvalidProtocolBufferException;
import org.pm.analyticsservice.service.AnalyticsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import patient.events.PatientEvent;

@Service
public class KafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumer.class);

    private final AnalyticsService analyticsService;

    public KafkaConsumer(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @KafkaListener(topics = "patient", groupId = "analytics-service")
    public void consumeEvent(byte[] event) {
        try {
            PatientEvent patientEvent = PatientEvent.parseFrom(event);

            // Record the event in analytics service
            analyticsService.recordEvent(
                    patientEvent.getPatientId(),
                    patientEvent.getName(),
                    patientEvent.getEmail(),
                    patientEvent.getEventType()
            );

            log.info("Received and recorded Patient Event: [PatientId={}, PatientName={}, EventType={}]",
                    patientEvent.getPatientId(),
                    patientEvent.getName(),
                    patientEvent.getEventType());

        } catch (InvalidProtocolBufferException e) {
            log.error("Error deserializing event: {}", e.getMessage());
        }
    }
}
