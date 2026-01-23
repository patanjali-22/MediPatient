package org.pm.billingservice.dto;

public class PaymentResponse {
    private String paymentId;
    private String patientId;
    private String status;
    private Long amount;
    private String currency;
    private String receiptUrl;

    public PaymentResponse() {}

    public PaymentResponse(String paymentId, String patientId, String status, Long amount, String currency, String receiptUrl) {
        this.paymentId = paymentId;
        this.patientId = patientId;
        this.status = status;
        this.amount = amount;
        this.currency = currency;
        this.receiptUrl = receiptUrl;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
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

    public String getReceiptUrl() {
        return receiptUrl;
    }

    public void setReceiptUrl(String receiptUrl) {
        this.receiptUrl = receiptUrl;
    }
}
