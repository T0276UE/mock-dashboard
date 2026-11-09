package com.mockdashboard.backend.auth;

import java.util.List;

public record AuthSessionResponse(
    boolean authenticated,
    String userId,
    String name,
    String role,
    String status,
    List<String> effectiveRoles,
    List<String> effectivePermissions,
    List<String> managedCustomerIds,
    String issuedAt
) {
}
