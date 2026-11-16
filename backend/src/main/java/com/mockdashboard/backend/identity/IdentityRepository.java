package com.mockdashboard.backend.identity;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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
        String sql = buildUserProfileSql() + " where au.status = 'ACTIVE' order by au.display_name asc, au.id asc";
        return jdbcTemplate.query(sql, this::mapUserProfile);
    }

    public Optional<DbUserProfile> findUserProfileById(UUID userId) {
        String sql = buildUserProfileSql() + " where au.id = ?";
        return jdbcTemplate.query(sql, this::mapUserProfile, userId).stream().findFirst();
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
        return """
            select
                au.id,
                au.organization_id,
                au.display_name,
                au.email,
                au.status as app_status,
                coalesce(lower(ur.role), 'user') as role,
                case
                    when lower(ur.role) = 'admin'
                        then '["dashboard:view","customers:manage","vehicles:manage","products:view","users:manage"]'
                    else '["dashboard:view","customers:view","vehicles:view","products:view"]'
                end as permissions_json,
                null::text as manager_user_id,
                lower(au.status) as profile_status
            from app_user au
            left join user_roles ur on ur.userid = au.id
            """;
    }

    public List<String> findCustomerIdsForUser(UUID userId) {
        return jdbcTemplate.queryForList(
            "select customer_id from customer_access where user_id = ? order by customer_id",
            String.class,
            userId
        );
    }

    @Transactional
    public List<String> replaceCustomerAccessForUser(UUID userId, List<String> customerIds, UUID grantedBy) {
        jdbcTemplate.update("delete from customer_access where user_id = ?", userId);

        List<Object[]> rows = new ArrayList<>();
        for (String customerId : customerIds) {
            if (customerId != null && !customerId.isBlank()) {
                rows.add(new Object[] { userId, customerId.trim(), grantedBy });
            }
        }

        if (!rows.isEmpty()) {
            jdbcTemplate.batchUpdate(
                "insert into customer_access (user_id, customer_id, granted_by) values (?, ?, ?)",
                rows
            );
        }

        return findCustomerIdsForUser(userId);
    }

    public void updateUserRole(UUID userId, String role) {
        jdbcTemplate.update(
            """
            insert into user_roles (userid, role) values (?, ?)
            on conflict (userid) do update set role = excluded.role
            """,
            userId,
            role
        );
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

    public long publishManagementTreeSnapshot(
        UUID treeId,
        long expectedVersion,
        String structureJson,
        int schemaVersion,
        UUID actorUserId,
        String reason
    ) {
        Long version = jdbcTemplate.queryForObject(
            """
            select version
            from publish_management_tree_snapshot(?, ?, cast(? as jsonb), ?, ?, ?, null)
            """,
            Long.class,
            treeId,
            expectedVersion,
            structureJson,
            schemaVersion,
            actorUserId,
            reason
        );

        if (version == null) {
            throw new IllegalStateException("Management tree snapshot publication returned no version.");
        }
        return version;
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
