package com.mockdashboard.backend.authorization.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record UserEntity(
    @JsonProperty("user_id") String userId,
    String name,
    String email,
    @JsonProperty("manager_user_id") String managerUserId,
    String role,
    List<String> permissions,
    String status
) {
}
