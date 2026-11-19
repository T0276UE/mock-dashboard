package com.mockdashboard.backend.access;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateUserRoleRequest(
    @NotBlank
    @Pattern(regexp = "(?i)user|admin", message = "role must be user or admin")
    String role
) {
}
