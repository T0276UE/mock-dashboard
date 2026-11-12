package com.mockdashboard.backend.authorization.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.OffsetDateTime;

public record AccessGrant(
    @JsonProperty("grant_id") Long grantId,
    @JsonProperty("user_id") String userId,
    @JsonProperty("customer_id") String customerId,
    @JsonProperty("granted_by") String grantedBy,
    @JsonProperty("source_grant_id") Long sourceGrantId,
    @JsonProperty("granted_at") OffsetDateTime grantedAt,
    @JsonProperty("revoked_at") OffsetDateTime revokedAt
) {
}
