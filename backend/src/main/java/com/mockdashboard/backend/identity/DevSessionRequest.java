package com.mockdashboard.backend.identity;

import jakarta.validation.constraints.NotBlank;

public record DevSessionRequest(
    @NotBlank(message = "userId is required")
    String userId
) {
}
