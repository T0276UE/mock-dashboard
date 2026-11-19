package com.mockdashboard.backend.databricks;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "databricks.jdbc")
public class DatabricksJdbcProperties {

    private String url;
    private String token;
    private String username = "token";
    private String catalog;
    private String schema = "default";
    private String customerAccessTable = "customer_access";
    private String localVinAccessTable = "local_vin_access";

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getCatalog() {
        return catalog;
    }

    public void setCatalog(String catalog) {
        this.catalog = catalog;
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
