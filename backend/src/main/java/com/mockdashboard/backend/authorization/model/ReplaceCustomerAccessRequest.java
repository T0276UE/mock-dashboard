package com.mockdashboard.backend.authorization.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReplaceCustomerAccessRequest(
    @NotBlank @JsonProperty("user_id") String userId,
    @NotNull @JsonProperty("customer_ids") List<String> customerIds,
    @JsonProperty("granted_by") String grantedBy
) {
}
