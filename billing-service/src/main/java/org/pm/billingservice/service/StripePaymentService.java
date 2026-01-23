package org.pm.billingservice.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import org.pm.billingservice.dto.CreatePaymentRequest;
import org.pm.billingservice.dto.PaymentIntentResponse;
import org.pm.billingservice.dto.PaymentResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class StripePaymentService {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentService.class);

    @Value("${stripe.api.key:sk_test_placeholder}")
    private String stripeApiKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
        log.info("Stripe API initialized");
    }

    /**
     * Create a PaymentIntent for client-side confirmation (Stripe Elements)
     */
    public PaymentIntentResponse createPaymentIntent(CreatePaymentRequest request) throws StripeException {
        // Convert amount to cents (Stripe uses smallest currency unit)
        long amountInCents = request.getAmount().multiply(new java.math.BigDecimal("100")).longValue();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency(request.getCurrency() != null ? request.getCurrency().toLowerCase() : "usd")
                .setDescription(request.getDescription() != null ? request.getDescription() : "Medical service payment")
                .setReceiptEmail(request.getPatientEmail())
                .putMetadata("patient_id", request.getPatientId())
                .putMetadata("patient_name", request.getPatientName())
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);

        log.info("Created PaymentIntent: {} for patient: {}", paymentIntent.getId(), request.getPatientId());

        return new PaymentIntentResponse(
                paymentIntent.getId(),
                paymentIntent.getClientSecret(),
                paymentIntent.getStatus(),
                paymentIntent.getAmount(),
                paymentIntent.getCurrency()
        );
    }

    /**
     * Retrieve payment status
     */
    public PaymentResponse getPaymentStatus(String paymentIntentId) throws StripeException {
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);

        String patientId = paymentIntent.getMetadata().get("patient_id");

        return new PaymentResponse(
                paymentIntent.getId(),
                patientId,
                paymentIntent.getStatus(),
                paymentIntent.getAmount(),
                paymentIntent.getCurrency(),
                null // Receipt URL is available after successful payment
        );
    }

    /**
     * Cancel a payment intent
     */
    public PaymentResponse cancelPayment(String paymentIntentId) throws StripeException {
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
        PaymentIntent canceledIntent = paymentIntent.cancel();

        String patientId = canceledIntent.getMetadata().get("patient_id");

        log.info("Canceled PaymentIntent: {}", paymentIntentId);

        return new PaymentResponse(
                canceledIntent.getId(),
                patientId,
                canceledIntent.getStatus(),
                canceledIntent.getAmount(),
                canceledIntent.getCurrency(),
                null
        );
    }
}
