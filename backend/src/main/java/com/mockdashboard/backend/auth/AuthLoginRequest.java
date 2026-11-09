package com.mockdashboard.backend.auth;

import jakarta.validation.constraints.NotBlank;

public record AuthLoginRequest(
    @NotBlank String userId
) {
}
