package com.mockdashboard.backend.databricks;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;

@Configuration
@EnableConfigurationProperties(DatabricksJdbcProperties.class)
public class DatabricksJdbcConfig {

    @Bean
    DataSource databricksDataSource(DatabricksJdbcProperties properties) {
        if (!StringUtils.hasText(properties.getUrl())) {
            throw new IllegalStateException("Missing Databricks JDBC URL. Set DATABRICKS_JDBC_URL or VITE_DATABRICKS_JDBC_URL.");
        }

        if (!StringUtils.hasText(properties.getToken())) {
            throw new IllegalStateException("Missing Databricks PAT. Set DATABRICKS_PERSONAL_ACCESS_TOKEN.");
        }

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("com.databricks.client.jdbc.Driver");
        dataSource.setUrl(properties.getUrl());
        dataSource.setUsername(properties.getUsername());
        dataSource.setPassword(properties.getToken());
        return dataSource;
    }

    @Bean
    JdbcTemplate jdbcTemplate(DataSource databricksDataSource) {
        return new JdbcTemplate(databricksDataSource);
    }
}
