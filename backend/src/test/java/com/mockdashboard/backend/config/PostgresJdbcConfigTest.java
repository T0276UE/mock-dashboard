package com.mockdashboard.backend.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PostgresJdbcConfigTest {

    @Test
    void parsesNeonConnectionUri() {
        PostgresConnectionDetails details = PostgresJdbcConfig.parseConnectionString(
            "postgresql://db_user:p%2Bss@db.example.com/neondb?sslmode=require&channel_binding=require"
        );

        assertEquals(
            "jdbc:postgresql://db.example.com/neondb?sslmode=require&channel_binding=require",
            details.jdbcUrl()
        );
        assertEquals("db_user", details.username());
        assertEquals("p+ss", details.password());
    }
}
