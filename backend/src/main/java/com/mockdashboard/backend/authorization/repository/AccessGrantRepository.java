package com.mockdashboard.backend.authorization.repository;

import com.mockdashboard.backend.authorization.model.AccessGrant;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class AccessGrantRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public AccessGrantRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<AccessGrant> findActiveCustomerViewGrants() {
        return jdbc.query("""
                SELECT grant_id, grantee_user_id, resource_id, grantor_user_id, source_grant_id, granted_at, revoked_at
                FROM access_grant
                WHERE resource_type = 'customer'
                  AND permission_code = 'customers:view'
                  AND revoked_at IS NULL
                ORDER BY grantee_user_id, resource_id
                """,
            Map.of(),
            (rs, rowNum) -> new AccessGrant(
                rs.getLong("grant_id"),
                rs.getString("grantee_user_id"),
                rs.getString("resource_id"),
                rs.getString("grantor_user_id"),
                (Long) rs.getObject("source_grant_id"),
                rs.getObject("granted_at", java.time.OffsetDateTime.class),
                rs.getObject("revoked_at", java.time.OffsetDateTime.class)
            )
        );
    }

    public List<String> findCustomerIds(String userId) {
        return jdbc.queryForList("""
                SELECT resource_id
                FROM access_grant
                WHERE grantee_user_id = :userId
                  AND resource_type = 'customer'
                  AND permission_code = 'customers:view'
                  AND revoked_at IS NULL
                ORDER BY resource_id
                """,
            Map.of("userId", userId),
            String.class
        );
    }

    public Optional<Long> findActiveGrantId(String granteeId, String permissionCode, String customerId) {
        return jdbc.query("""
                SELECT grant_id
                FROM access_grant
                WHERE grantee_user_id = :granteeId
                  AND permission_code = :permissionCode
                  AND resource_type = 'customer'
                  AND resource_id = :customerId
                  AND revoked_at IS NULL
                """,
            Map.of(
                "granteeId", granteeId,
                "permissionCode", permissionCode,
                "customerId", customerId
            ),
            (rs, rowNum) -> rs.getLong("grant_id")
        ).stream().findFirst();
    }

    public void revokeCustomerViewGrant(String userId, String customerId, String revokedBy) {
        jdbc.update("""
                UPDATE access_grant
                SET revoked_at = CURRENT_TIMESTAMP,
                    revoked_by_user_id = :revokedBy
                WHERE grantee_user_id = :userId
                  AND permission_code = 'customers:view'
                  AND resource_type = 'customer'
                  AND resource_id = :customerId
                  AND revoked_at IS NULL
                """,
            Map.of("userId", userId, "customerId", customerId, "revokedBy", revokedBy)
        );
    }

    public long grantCustomerView(String userId, String customerId, String grantorId, long sourceGrantId) {
        return jdbc.queryForObject("""
                INSERT INTO access_grant (
                    grantee_user_id, permission_code, resource_type, resource_id,
                    grantor_user_id, source_grant_id
                )
                VALUES (:userId, 'customers:view', 'customer', :customerId, :grantorId, :sourceGrantId)
                RETURNING grant_id
                """,
            Map.of(
                "userId", userId,
                "customerId", customerId,
                "grantorId", grantorId,
                "sourceGrantId", sourceGrantId
            ),
            Long.class
        );
    }
}
