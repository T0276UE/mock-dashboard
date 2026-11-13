package com.mockdashboard.backend.identity;

import java.util.UUID;

public record DbUserProfile(
    UUID id,
    UUID organizationId,
    String displayName,
    String email,
    String appStatus,
    String role,
    String permissionsJson,
    String managerUserId,
    String profileStatus
) {
}
