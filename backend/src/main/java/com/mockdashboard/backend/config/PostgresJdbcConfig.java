package com.mockdashboard.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableConfigurationProperties(PostgresJdbcProperties.class)
public class PostgresJdbcConfig {

    @Bean
    DataSource postgresDataSource(PostgresJdbcProperties properties) {
        if (!StringUtils.hasText(properties.getUrl())) {
            throw new IllegalStateException("Missing PostgreSQL URL. Set DATABASE_URL_POOLED or DATABASE_URL.");
        }

        PostgresConnectionDetails connectionDetails;
        try {
            connectionDetails = parseConnectionString(properties.getUrl());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                "Invalid PostgreSQL URL. Set DATABASE_URL_POOLED or DATABASE_URL to a valid PostgreSQL connection string.",
                exception
            );
        }

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(connectionDetails.jdbcUrl());
        dataSource.setUsername(connectionDetails.username());
        dataSource.setPassword(connectionDetails.password());
        return dataSource;
    }

    @Bean
    JdbcTemplate jdbcTemplate(DataSource postgresDataSource) {
        return new JdbcTemplate(postgresDataSource);
    }

    static PostgresConnectionDetails parseConnectionString(String connectionString) {
        try {
            URI uri = new URI(connectionString.trim());
            String scheme = uri.getScheme();
            if (!("postgresql".equalsIgnoreCase(scheme) || "postgres".equalsIgnoreCase(scheme))
                || !StringUtils.hasText(uri.getRawAuthority())
                || !StringUtils.hasText(uri.getRawPath())
                || uri.getRawFragment() != null) {
                throw new IllegalArgumentException("Expected a PostgreSQL connection URI with a database.");
            }

            String authority = uri.getRawAuthority();
            String userInfo = uri.getRawUserInfo();
            int credentialsSeparator = authority.lastIndexOf('@');
            if (!StringUtils.hasText(userInfo) || credentialsSeparator < 0) {
                throw new IllegalArgumentException("The PostgreSQL connection URI must include username and password.");
            }

            int passwordSeparator = userInfo.indexOf(':');
            if (passwordSeparator < 1 || passwordSeparator == userInfo.length() - 1) {
                throw new IllegalArgumentException("The PostgreSQL connection URI must include username and password.");
            }

            String username = decodeUriComponent(userInfo.substring(0, passwordSeparator));
            String password = decodeUriComponent(userInfo.substring(passwordSeparator + 1));
            String jdbcUrl = "jdbc:postgresql://"
                + authority.substring(credentialsSeparator + 1)
                + uri.getRawPath();
            if (uri.getRawQuery() != null) {
                jdbcUrl += "?" + uri.getRawQuery();
            }

            return new PostgresConnectionDetails(jdbcUrl, username, password);
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("Malformed PostgreSQL connection URI.", exception);
        }
    }

    private static String decodeUriComponent(String value) {
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
}

record PostgresConnectionDetails(String jdbcUrl, String username, String password) {
}
