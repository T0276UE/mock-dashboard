package com.mockdashboard.backend.databricks;

public record CustomerAccessRecord(
    String userId,
    String customerId,
    String grantedBy
) {
}
