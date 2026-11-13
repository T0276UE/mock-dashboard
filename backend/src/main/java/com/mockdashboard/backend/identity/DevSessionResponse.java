package com.mockdashboard.backend.identity;

import java.util.UUID;

public record DevSessionResponse(
    boolean authenticated,
    UUID userId,
    UUID organizationId,
    String displayName,
    String status,
    String issuedAt
) {
}
