package com.mockdashboard.backend.authorization.repository;

import com.mockdashboard.backend.authorization.model.UserEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class UserRepository {

    private final NamedParameterJdbcTemplate jdbc;
    private final PermissionRepository permissionRepository;

    public UserRepository(NamedParameterJdbcTemplate jdbc, PermissionRepository permissionRepository) {
        this.jdbc = jdbc;
        this.permissionRepository = permissionRepository;
    }

    public List<UserEntity> findAll() {
        return jdbc.query("""
                SELECT user_id, name, email, manager_user_id, role_code, status
                FROM app_user
                ORDER BY user_id
                """,
            Map.of(),
            (rs, rowNum) -> mapUser(
                rs.getString("user_id"),
                rs.getString("name"),
                rs.getString("email"),
                rs.getString("manager_user_id"),
                rs.getString("role_code"),
                rs.getString("status")
            )
        );
    }

    public Optional<UserEntity> findById(String userId) {
        return jdbc.query("""
                SELECT user_id, name, email, manager_user_id, role_code, status
                FROM app_user
                WHERE user_id = :userId
                """,
            Map.of("userId", userId),
            (rs, rowNum) -> mapUser(
                rs.getString("user_id"),
                rs.getString("name"),
                rs.getString("email"),
                rs.getString("manager_user_id"),
                rs.getString("role_code"),
                rs.getString("status")
            )
        ).stream().findFirst();
    }

    public boolean exists(String userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM app_user WHERE user_id = :userId)",
            Map.of("userId", userId),
            Boolean.class
        ));
    }

    public void updateProfile(String userId, String role, String status, String managerUserId) {
        var parameters = new MapSqlParameterSource()
            .addValue("userId", userId)
            .addValue("role", role)
            .addValue("status", status)
            .addValue("managerUserId", managerUserId, Types.VARCHAR);
        jdbc.update("""
                UPDATE app_user
                SET role_code = :role,
                    status = :status,
                    manager_user_id = :managerUserId,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :userId
                """,
            parameters
        );
    }

    public boolean isInManagerHierarchy(String managerUserId, String userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                WITH RECURSIVE descendants(user_id) AS (
                    SELECT user_id
                    FROM app_user
                    WHERE manager_user_id = :managerUserId
                    UNION ALL
                    SELECT child.user_id
                    FROM app_user child
                    JOIN descendants parent ON child.manager_user_id = parent.user_id
                )
                SELECT EXISTS (
                    SELECT 1 FROM descendants WHERE user_id = :userId
                )
                """,
            Map.of("managerUserId", managerUserId, "userId", userId),
            Boolean.class
        ));
    }

    private UserEntity mapUser(
            String userId,
            String name,
            String email,
            String managerUserId,
            String role,
            String status) {
        return new UserEntity(
            userId,
            name,
            email,
            managerUserId,
            role,
            permissionRepository.findUserPermissions(userId),
            status
        );
    }
}
