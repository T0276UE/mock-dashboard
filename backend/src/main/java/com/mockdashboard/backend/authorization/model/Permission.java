package com.mockdashboard.backend.authorization.model;

public record Permission(
    String permissionCode,
    String resourceType,
    String action,
    String description
) {
}
