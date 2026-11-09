package com.mockdashboard.backend.databricks;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DatabricksTableNameResolver {

    private final DatabricksJdbcProperties properties;

    public DatabricksTableNameResolver(DatabricksJdbcProperties properties) {
        this.properties = properties;
    }

    public String customerAccessTable() {
        return fullyQualified(properties.getCustomerAccessTable());
    }

    public String localVinAccessTable() {
        return fullyQualified(properties.getLocalVinAccessTable());
    }

    private String fullyQualified(String table) {
        StringBuilder builder = new StringBuilder();

        if (StringUtils.hasText(properties.getCatalog())) {
            builder.append(quoteIdentifier(properties.getCatalog())).append('.');
        }

        builder.append(quoteIdentifier(properties.getSchema()))
            .append('.')
            .append(quoteIdentifier(table));

        return builder.toString();
    }

    private String quoteIdentifier(String value) {
        String normalized = value == null ? "" : value.trim();
        return "`" + normalized.replace("`", "``") + "`";
    }
}
