package com.mockdashboard.backend.authorization;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Transactional
@EnabledIfEnvironmentVariable(named = "AUTHORIZATION_FLOW_TESTS", matches = "true")
class AuthorizationCustomerAccessFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void reactCustomerAccessFlowReadsAndWritesScopedPostgresGrants() throws Exception {
        mockMvc.perform(get("/api/v1/users/authorization"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].user_id").value("USR-001"))
            .andExpect(jsonPath("$[0].permissions[0]").value("dashboard:view"))
            .andExpect(jsonPath("$[0].permissions").value(org.hamcrest.Matchers.hasItem("products:view")));

        mockMvc.perform(get("/api/v1/users/authorization/customer-access"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.user_id == 'USR-003' && @.customer_id == 'CUST-000208')]").exists());

        jdbcTemplate.update("""
            INSERT INTO app_user (user_id, name, email, manager_user_id, role_code, status)
            VALUES ('USR-AUTH-FLOW-TEST', 'Authorization Flow Test', 'authorization-flow-test@example.com', 'USR-001', 'user', 'active')
            """);

        mockMvc.perform(put("/api/v1/users/authorization/customer-access")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "user_id": "USR-AUTH-FLOW-TEST",
                      "customer_ids": ["CUST-000124"]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].user_id").value("USR-AUTH-FLOW-TEST"))
            .andExpect(jsonPath("$[0].customer_id").value("CUST-000124"))
            .andExpect(jsonPath("$[0].granted_by").value("USR-001"));

        mockMvc.perform(get("/api/v1/users/authorization/customer-access"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.user_id == 'USR-AUTH-FLOW-TEST' && @.customer_id == 'CUST-000124')]").exists());
    }

    @Test
    void customerGrantCannotExceedGrantorsManagedScope() throws Exception {
        mockMvc.perform(put("/api/v1/users/authorization/customer-access")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "user_id": "USR-003",
                      "customer_ids": ["CUST-000311"]
                    }
                    """))
            .andExpect(status().isForbidden());
    }
}
