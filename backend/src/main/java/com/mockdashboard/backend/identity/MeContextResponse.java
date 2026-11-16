package com.mockdashboard.backend.identity;

import java.util.List;
import java.util.UUID;

public record MeContextResponse(
    UUID userId,
    UUID organizationId,
    String role,
    List<String> effectiveRoles,
    List<String> effectivePermissions,
    List<String> managedCustomerIds,
    UUID treeId,
    long treeVersion,
    UUID managerUserId,
    List<UUID> directReportUserIds,
    List<UUID> peerUserIds,
    List<UUID> pathToRootUserIds
) {
}
