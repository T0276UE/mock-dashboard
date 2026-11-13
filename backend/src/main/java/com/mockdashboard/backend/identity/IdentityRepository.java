package com.mockdashboard.backend.identity;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@Profile("postgres")
public class IdentityRepository {

    private final JdbcTemplate jdbcTemplate;

    public IdentityRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<DbAppUser> findActiveUsers() {
        String sql = """
            select id, organization_id, display_name, email, status
            from app_user
            where status = 'ACTIVE'
            order by display_name asc
            """;
        return jdbcTemplate.query(sql, this::mapAppUser);
    }

    public Optional<DbAppUser> findUserById(UUID userId) {
        String sql = """
            select id, organization_id, display_name, email, status
            from app_user
            where id = ?
            """;

        List<DbAppUser> results = jdbcTemplate.query(sql, this::mapAppUser, userId);
        return results.stream().findFirst();
    }

    public List<DbUserProfile> findActiveUserProfiles() {
        String sql = buildUserProfileSql() + " where au.status = 'ACTIVE' order by au.display_name asc";
        return jdbcTemplate.query(sql, this::mapUserProfile);
    }

    public Optional<ManagementTreeHead> findTreeHeadByOrganizationId(UUID organizationId) {
        String sql = """
            select tree_id, organization_id, current_version
            from management_tree_head
            where organization_id = ?
            """;

        List<ManagementTreeHead> results = jdbcTemplate.query(sql, (rs, rowNum) -> new ManagementTreeHead(
            rs.getObject("tree_id", UUID.class),
            rs.getObject("organization_id", UUID.class),
            rs.getLong("current_version")
        ), organizationId);

        return results.stream().findFirst();
    }

    private String buildUserProfileSql() {
        if (!usersTableExists()) {
            return """
                select
                    au.id,
                    au.organization_id,
                    au.display_name,
                    au.email,
                    au.status as app_status,
                    'user' as role,
                    '[]' as permissions_json,
                    null::text as manager_user_id,
                    lower(au.status) as profile_status
                from app_user au
                """;
        }

        String joinPredicate = usersTableHasAppUserIdColumn()
            ? "(u.app_user_id = au.id OR (u.app_user_id IS NULL AND lower(u.email) = lower(au.email)))"
            : "lower(u.email) = lower(au.email)";

        return """
            select
                au.id,
                au.organization_id,
                au.display_name,
                au.email,
                au.status as app_status,
                coalesce(lower(u.role), 'user') as role,
                coalesce(u.permissions, '[]') as permissions_json,
                u.manager_user_id,
                coalesce(lower(u.status), lower(au.status)) as profile_status
            from app_user au
            left join users u on
            """ + joinPredicate;
    }

    private boolean usersTableExists() {
        Boolean exists = jdbcTemplate.queryForObject(
            "select to_regclass('public.users') is not null",
            Boolean.class
        );

        return Boolean.TRUE.equals(exists);
    }

    private boolean usersTableHasAppUserIdColumn() {
        if (!usersTableExists()) {
            return false;
        }

        Integer count = jdbcTemplate.queryForObject(
            """
            select count(*)
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'users'
              and column_name = 'app_user_id'
            """,
            Integer.class
        );

        return count != null && count > 0;
    }

    public Optional<ManagementTreeSnapshot> findTreeSnapshot(UUID treeId, long version) {
        String sql = """
            select structure::text as structure_json, schema_version
            from management_tree_snapshot
            where tree_id = ? and version = ?
            """;

        List<ManagementTreeSnapshot> results = jdbcTemplate.query(sql, (rs, rowNum) -> new ManagementTreeSnapshot(
            rs.getString("structure_json"),
            rs.getInt("schema_version")
        ), treeId, version);

        return results.stream().findFirst();
    }

    private DbAppUser mapAppUser(ResultSet resultSet, int rowNum) throws SQLException {
        return new DbAppUser(
            resultSet.getObject("id", UUID.class),
            resultSet.getObject("organization_id", UUID.class),
            resultSet.getString("display_name"),
            resultSet.getString("email"),
            resultSet.getString("status")
        );
    }

    private DbUserProfile mapUserProfile(ResultSet resultSet, int rowNum) throws SQLException {
        return new DbUserProfile(
            resultSet.getObject("id", UUID.class),
            resultSet.getObject("organization_id", UUID.class),
            resultSet.getString("display_name"),
            resultSet.getString("email"),
            resultSet.getString("app_status"),
            resultSet.getString("role"),
            resultSet.getString("permissions_json"),
            resultSet.getString("manager_user_id"),
            resultSet.getString("profile_status")
        );
    }
}
