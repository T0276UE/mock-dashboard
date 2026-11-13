package com.mockdashboard.backend.identity;

import java.util.List;
import java.util.UUID;

public record MeContextResponse(
    UUID userId,
    UUID organizationId,
    UUID treeId,
    long treeVersion,
    UUID managerUserId,
    List<UUID> directReportUserIds,
    List<UUID> peerUserIds,
    List<UUID> pathToRootUserIds
) {
}
