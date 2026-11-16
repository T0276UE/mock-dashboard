package com.mockdashboard.backend.identity;

import java.util.List;
import java.util.UUID;

public record DevSessionResponse(
    boolean authenticated,
    UUID userId,
    UUID organizationId,
    String displayName,
    String status,
    String role,
    List<String> effectiveRoles,
    List<String> effectivePermissions,
    List<String> managedCustomerIds,
    String issuedAt
) {
}
