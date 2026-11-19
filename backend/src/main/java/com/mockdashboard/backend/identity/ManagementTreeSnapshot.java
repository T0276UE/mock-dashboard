package com.mockdashboard.backend.identity;

public record ManagementTreeSnapshot(
    String structureJson,
    int schemaVersion
) {
}
