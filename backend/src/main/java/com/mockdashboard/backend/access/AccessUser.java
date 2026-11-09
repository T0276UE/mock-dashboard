package com.mockdashboard.backend.access;

import java.util.List;

public record AccessUser(
    String userId,
    String name,
    String email,
    String managerUserId,
    String role,
    List<String> permissions,
    String status
) {
}
