package com.mockdashboard.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "database.jdbc")
public class PostgresJdbcProperties {

    private String url;
    private String schema = "public";
    private String customerAccessTable = "customer_access";
    private String localVinAccessTable = "local_vin_access";

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getSchema() {
        return schema;
    }

    public void setSchema(String schema) {
        this.schema = schema;
    }

    public String getCustomerAccessTable() {
        return customerAccessTable;
    }

    public void setCustomerAccessTable(String customerAccessTable) {
        this.customerAccessTable = customerAccessTable;
    }

    public String getLocalVinAccessTable() {
        return localVinAccessTable;
    }

    public void setLocalVinAccessTable(String localVinAccessTable) {
        this.localVinAccessTable = localVinAccessTable;
    }
}
