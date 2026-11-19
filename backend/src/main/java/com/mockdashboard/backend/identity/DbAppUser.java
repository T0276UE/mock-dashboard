package com.mockdashboard.backend.identity;

import java.util.UUID;

public record DbAppUser(
    UUID id,
    UUID organizationId,
    String displayName,
    String email,
    String status
) {
}
