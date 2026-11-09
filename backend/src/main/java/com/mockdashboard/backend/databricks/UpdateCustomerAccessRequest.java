package com.mockdashboard.backend.databricks;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record UpdateCustomerAccessRequest(
    @NotEmpty List<String> customerIds,
    String grantedBy
) {
}
