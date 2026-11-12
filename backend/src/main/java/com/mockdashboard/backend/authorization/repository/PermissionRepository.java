package com.mockdashboard.backend.authorization.repository;

import com.mockdashboard.backend.authorization.model.Permission;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class PermissionRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public PermissionRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<String> findUserPermissions(String userId) {
        return jdbc.queryForList("""
                WITH effective_permissions AS (
                    SELECT permission_code, permission_order AS sort_order
                    FROM user_permission
                    WHERE user_id = :userId
                    UNION ALL
                    SELECT role_permission.permission_code, 100000 AS sort_order
                    FROM app_user
                    JOIN role_permission ON role_permission.role_code = app_user.role_code
                    WHERE app_user.user_id = :userId
                ),
                distinct_permissions AS (
                    SELECT permission_code, MIN(sort_order) AS sort_order
                    FROM effective_permissions
                    GROUP BY permission_code
                )
                SELECT permission_code
                FROM distinct_permissions
                ORDER BY sort_order, permission_code
                """,
            Map.of("userId", userId),
            String.class
        );
    }

    public List<Permission> findAll() {
        return jdbc.query("""
                SELECT permission_code, resource_type, action, description
                FROM permission_definition
                ORDER BY permission_code
                """,
            Map.of(),
            (rs, rowNum) -> new Permission(
                rs.getString("permission_code"),
                rs.getString("resource_type"),
                rs.getString("action"),
                rs.getString("description")
            )
        );
    }

    public boolean hasUserPermission(String userId, String roleCode, String permissionCode) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM user_permission
                    WHERE user_id = :userId AND permission_code = :permissionCode
                    UNION ALL
                    SELECT 1 FROM role_permission
                    WHERE role_code = :roleCode AND permission_code = :permissionCode
                )
                """,
            Map.of("userId", userId, "roleCode", roleCode, "permissionCode", permissionCode),
            Boolean.class
        ));
    }

    public boolean hasScopedGrant(String userId, String permissionCode, String resourceType, String resourceId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM access_grant
                    WHERE grantee_user_id = :userId
                      AND permission_code = :permissionCode
                      AND resource_type = :resourceType
                      AND resource_id = :resourceId
                      AND revoked_at IS NULL
                )
                """,
            Map.of(
                "userId", userId,
                "permissionCode", permissionCode,
                "resourceType", resourceType,
                "resourceId", resourceId
            ),
            Boolean.class
        ));
    }

    public List<String> findUndefinedPermissions(List<String> codes) {
        if (codes.isEmpty()) {
            return List.of();
        }
        List<String> defined = jdbc.queryForList("""
                SELECT permission_code
                FROM permission_definition
                WHERE permission_code IN (:codes)
                """,
            Map.of("codes", codes),
            String.class
        );
        return codes.stream().distinct().filter(code -> !defined.contains(code)).toList();
    }

    public void replaceUserPermissions(String userId, List<String> permissions) {
        jdbc.update("DELETE FROM user_permission WHERE user_id = :userId", Map.of("userId", userId));
        for (int order = 0; order < permissions.size(); order++) {
            jdbc.update("""
                    INSERT INTO user_permission (user_id, permission_code, permission_order)
                    VALUES (:userId, :permissionCode, :permissionOrder)
                    """,
                Map.of(
                    "userId", userId,
                    "permissionCode", permissions.get(order),
                    "permissionOrder", order
                )
            );
        }
    }
}
