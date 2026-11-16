package com.mockdashboard.backend.access;

import java.util.UUID;

public record UpdateUserManagerRequest(
    UUID managerUserId
) {
}
