package com.mockdashboard.backend.databricks;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Repository
@Profile("!postgres")
public class DatabricksAccessRepository {

    private final JdbcTemplate jdbcTemplate;
    private final DatabricksTableNameResolver tableNameResolver;
    private final ObjectMapper objectMapper;

    public DatabricksAccessRepository(
        JdbcTemplate jdbcTemplate,
        DatabricksTableNameResolver tableNameResolver,
        ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.tableNameResolver = tableNameResolver;
        this.objectMapper = objectMapper;
    }

    public List<CustomerAccessRecord> findCustomerAccessByUserId(String userId) {
        String sql = "SELECT user_id, customer_id, granted_by FROM " + tableNameResolver.customerAccessTable() + " WHERE user_id = ? ORDER BY customer_id";

        return jdbcTemplate.query(sql, (rs, rowNum) -> new CustomerAccessRecord(
            rs.getString("user_id"),
            rs.getString("customer_id"),
            rs.getString("granted_by")
        ), userId);
    }

    public List<CustomerAccessRecord> replaceCustomerAccess(String userId, List<String> customerIds, String grantedBy) {
        String deleteSql = "DELETE FROM " + tableNameResolver.customerAccessTable() + " WHERE user_id = ?";
        jdbcTemplate.update(deleteSql, userId);

        String insertSql = "INSERT INTO " + tableNameResolver.customerAccessTable() + " (user_id, customer_id, granted_by) VALUES (?, ?, ?)";

        List<Object[]> batchArgs = new ArrayList<>();
        for (String customerId : customerIds) {
            if (customerId == null || customerId.isBlank()) {
                continue;
            }

            batchArgs.add(new Object[] { userId, customerId.trim(), grantedBy });
        }

        if (!batchArgs.isEmpty()) {
            jdbcTemplate.batchUpdate(insertSql, batchArgs);
        }

        return findCustomerAccessByUserId(userId);
    }

    public List<LocalVinAccessRecord> findLocalVinAccess(String vin, String customerId, int limit) {
        StringBuilder sql = new StringBuilder("SELECT vehicleId, customerID, pendingCustomerID, testvehicle, vin, name, make, model, year, timestamp, uploaderUserID FROM ")
            .append(tableNameResolver.localVinAccessTable())
            .append(" WHERE 1=1");

        List<Object> args = new ArrayList<>();

        if (vin != null && !vin.isBlank()) {
            sql.append(" AND vin = ?");
            args.add(vin.trim());
        }

        if (customerId != null && !customerId.isBlank()) {
            sql.append(" AND customerID = ?");
            args.add(customerId.trim());
        }

        sql.append(" ORDER BY timestamp DESC LIMIT ?");
        args.add(limit);

        return jdbcTemplate.query(sql.toString(), this::mapLocalVinAccessRecord, args.toArray());
    }

    public int insertLocalVinAccess(List<LocalVinAccessRecord> records) {
        String sql = "INSERT INTO " + tableNameResolver.localVinAccessTable() + " (vehicleId, customerID, pendingCustomerID, testvehicle, vin, name, make, model, year, timestamp, uploaderUserID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        List<Object[]> batchArgs = new ArrayList<>();

        for (LocalVinAccessRecord record : records) {
            String timestamp = record.timestamp();
            if (timestamp == null || timestamp.isBlank()) {
                timestamp = Instant.now().toString();
            }

            batchArgs.add(new Object[] {
                record.vehicleId(),
                record.customerId(),
                toJson(record.pendingCustomerId()),
                record.testvehicle(),
                record.vin(),
                record.name(),
                record.make(),
                record.model(),
                record.year(),
                timestamp,
                record.uploaderUserId(),
            });
        }

        int[] updateCounts = jdbcTemplate.batchUpdate(sql, batchArgs);
        return (int) java.util.Arrays.stream(updateCounts).filter((count) -> count >= 0).count();
    }

    private LocalVinAccessRecord mapLocalVinAccessRecord(ResultSet rs, int rowNum) throws SQLException {
        return new LocalVinAccessRecord(
            rs.getString("vehicleId"),
            rs.getString("customerID"),
            rs.getString("pendingCustomerID"),
            rs.getObject("testvehicle") != null ? rs.getBoolean("testvehicle") : null,
            rs.getString("vin"),
            rs.getString("name"),
            rs.getString("make"),
            rs.getString("model"),
            rs.getString("year"),
            rs.getString("timestamp"),
            rs.getString("uploaderUserID")
        );
    }

    private String toJson(Object pendingCustomerId) {
        if (Objects.isNull(pendingCustomerId)) {
            return null;
        }

        if (pendingCustomerId instanceof String asString) {
            return asString;
        }

        try {
            return objectMapper.writeValueAsString(pendingCustomerId);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to serialize pendingCustomerID payload.", exception);
        }
    }
}
