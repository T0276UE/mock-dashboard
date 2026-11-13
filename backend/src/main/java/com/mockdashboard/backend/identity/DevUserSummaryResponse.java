package com.mockdashboard.backend.identity;

import java.util.List;
import java.util.UUID;

public record DevUserSummaryResponse(
    UUID userId,
    UUID organizationId,
    String displayName,
    String email,
    String status,
    String role,
    List<String> permissions,
    String managerUserId
) {
}
