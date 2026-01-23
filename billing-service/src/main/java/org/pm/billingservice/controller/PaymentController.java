package org.pm.billingservice.controller;

import com.stripe.exception.StripeException;
import org.pm.billingservice.dto.CreatePaymentRequest;
import org.pm.billingservice.dto.PaymentIntentResponse;
import org.pm.billingservice.dto.PaymentResponse;
import org.pm.billingservice.service.StripePaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final StripePaymentService stripePaymentService;

    public PaymentController(StripePaymentService stripePaymentService) {
        this.stripePaymentService = stripePaymentService;
    }

    /**
     * Create a payment intent for a patient
     * POST /payments/create-intent
     */
    @PostMapping("/create-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody CreatePaymentRequest request) {
        try {
            log.info("Creating payment intent for patient: {}, amount: {}",
                    request.getPatientId(), request.getAmount());

            PaymentIntentResponse response = stripePaymentService.createPaymentIntent(request);
            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("Stripe error creating payment intent: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error creating payment intent: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create payment intent"));
        }
    }

    /**
     * Get payment status
     * GET /payments/{paymentIntentId}
     */
    @GetMapping("/{paymentIntentId}")
    public ResponseEntity<?> getPaymentStatus(@PathVariable String paymentIntentId) {
        try {
            PaymentResponse response = stripePaymentService.getPaymentStatus(paymentIntentId);
            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("Stripe error getting payment status: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cancel a payment
     * POST /payments/{paymentIntentId}/cancel
     */
    @PostMapping("/{paymentIntentId}/cancel")
    public ResponseEntity<?> cancelPayment(@PathVariable String paymentIntentId) {
        try {
            PaymentResponse response = stripePaymentService.cancelPayment(paymentIntentId);
            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("Stripe error canceling payment: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Health check
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "billing-payments"));
    }
}
