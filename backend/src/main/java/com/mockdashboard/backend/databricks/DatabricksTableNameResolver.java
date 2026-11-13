package com.mockdashboard.backend.databricks;

import com.mockdashboard.backend.config.PostgresJdbcProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DatabricksTableNameResolver {

    private final PostgresJdbcProperties properties;

    public DatabricksTableNameResolver(PostgresJdbcProperties properties) {
        this.properties = properties;
    }

    public String customerAccessTable() {
        return fullyQualified(properties.getCustomerAccessTable());
    }

    public String localVinAccessTable() {
        return fullyQualified(properties.getLocalVinAccessTable());
    }

    private String fullyQualified(String table) {
        return quoteIdentifier(properties.getSchema()) + "." + quoteIdentifier(table);
    }

    private String quoteIdentifier(String value) {
        String normalized = value == null ? "" : value.trim();
        return "\"" + normalized.replace("\"", "\"\"") + "\"";
    }
}
