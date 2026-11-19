package com.mockdashboard.backend.databricks;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Repository
@Profile("postgres")
public class PostgresAccessDataRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PostgresAccessDataRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<LocalVinAccessRecord> findLocalVinAccess(String vin, String customerId, int limit) {
        StringBuilder sql = new StringBuilder("""
            select vehicle_id, customer_id, pending_customer_id, test_vehicle, vin,
                   name, make, model, year, event_timestamp, uploader_user_id
            from local_vin_access
            where 1=1
            """);
        List<Object> args = new ArrayList<>();

        if (vin != null && !vin.isBlank()) {
            sql.append(" and vin = ?");
            args.add(vin.trim());
        }
        if (customerId != null && !customerId.isBlank()) {
            sql.append(" and customer_id = ?");
            args.add(customerId.trim());
        }

        sql.append(" order by event_timestamp desc limit ?");
        args.add(limit);
        return jdbcTemplate.query(sql.toString(), this::mapRecord, args.toArray());
    }

    public int insertLocalVinAccess(List<LocalVinAccessRecord> records) {
        String sql = """
            insert into local_vin_access (
                vehicle_id, customer_id, pending_customer_id, test_vehicle, vin,
                name, make, model, year, event_timestamp, uploader_user_id
            ) values (?, ?, cast(? as jsonb), ?, ?, ?, ?, ?, ?, cast(? as timestamptz), cast(? as uuid))
            on conflict (vehicle_id) do update set
                customer_id = excluded.customer_id,
                pending_customer_id = excluded.pending_customer_id,
                test_vehicle = excluded.test_vehicle,
                vin = excluded.vin,
                name = excluded.name,
                make = excluded.make,
                model = excluded.model,
                year = excluded.year,
                event_timestamp = excluded.event_timestamp,
                uploader_user_id = excluded.uploader_user_id
            """;

        List<Object[]> rows = records.stream().map(record -> new Object[] {
            record.vehicleId(),
            record.customerId(),
            toJson(record.pendingCustomerId()),
            record.testvehicle(),
            record.vin(),
            record.name(),
            record.make(),
            record.model(),
            record.year(),
            record.timestamp() == null || record.timestamp().isBlank() ? Instant.now().toString() : record.timestamp(),
            record.uploaderUserId()
        }).toList();

        return (int) Arrays.stream(jdbcTemplate.batchUpdate(sql, rows)).filter(count -> count >= 0).count();
    }

    private LocalVinAccessRecord mapRecord(ResultSet rs, int rowNum) throws SQLException {
        return new LocalVinAccessRecord(
            rs.getString("vehicle_id"),
            rs.getString("customer_id"),
            parseJson(rs.getString("pending_customer_id")),
            rs.getObject("test_vehicle") == null ? null : rs.getBoolean("test_vehicle"),
            rs.getString("vin"),
            rs.getString("name"),
            rs.getString("make"),
            rs.getString("model"),
            rs.getString("year"),
            rs.getObject("event_timestamp", java.time.OffsetDateTime.class).toInstant().toString(),
            rs.getString("uploader_user_id")
        );
    }

    private Object parseJson(String value) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, Object.class);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Invalid pending_customer_id JSON in Neon.", exception);
        }
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalArgumentException("Unable to serialize pendingCustomerID payload.", exception);
        }
    }
}
