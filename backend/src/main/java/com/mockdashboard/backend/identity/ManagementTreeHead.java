package com.mockdashboard.backend.identity;

import java.util.UUID;

public record ManagementTreeHead(
    UUID treeId,
    UUID organizationId,
    long currentVersion
) {
}
