package com.mockdashboard.backend.access;

import java.util.List;

public record SessionMeResponse(
    String userId,
    String name,
    String role,
    String status,
    List<String> effectiveRoles,
    List<String> effectivePermissions,
    List<String> managedCustomerIds
) {
}
