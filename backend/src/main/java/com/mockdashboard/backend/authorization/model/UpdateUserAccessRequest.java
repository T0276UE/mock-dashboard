package com.mockdashboard.backend.authorization.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record UpdateUserAccessRequest(
    String role,
    List<String> permissions,
    String status,
    @JsonProperty("manager_user_id") String managerUserId,
    @JsonProperty("managed_customer_ids") List<@NotBlank String> managedCustomerIds
) {
}
