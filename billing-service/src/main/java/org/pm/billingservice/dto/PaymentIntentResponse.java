package org.pm.billingservice.dto;

public class PaymentIntentResponse {
    private String paymentIntentId;
    private String clientSecret;
    private String status;
    private Long amount;
    private String currency;

    public PaymentIntentResponse() {}

    public PaymentIntentResponse(String paymentIntentId, String clientSecret, String status, Long amount, String currency) {
        this.paymentIntentId = paymentIntentId;
        this.clientSecret = clientSecret;
        this.status = status;
        this.amount = amount;
        this.currency = currency;
    }

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public void setPaymentIntentId(String paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }
}
