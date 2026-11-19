package com.mockdashboard.backend.identity;

import com.mockdashboard.backend.access.SessionMeResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DevSessionController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("postgres")
class DevSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdentityService identityService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getDevUsers_returnsActiveUsers() throws Exception {
        when(identityService.listSelectableUsers()).thenReturn(List.of(
            new DevUserSummaryResponse(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"),
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "Alice Patel",
                "alice@example.com",
                "ACTIVE",
                "USER",
                List.of(),
                null,
                List.of("CUST-000124")
            )
        ));

        mockMvc.perform(get("/api/v1/dev/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].displayName").value("Alice Patel"));
    }

    @Test
    void postDevSession_returnsSessionPayload() throws Exception {
        UUID userId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");
        UUID orgId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        when(identityService.requireUserById(eq(userId.toString()))).thenReturn(new DbAppUser(
            userId,
            orgId,
            "Alice Patel",
            "alice@example.com",
            "ACTIVE"
        ));
        when(identityService.buildSession(eq(userId))).thenReturn(new SessionMeResponse(
            userId.toString(),
            "Alice Patel",
            "admin",
            "active",
            List.of("user", "admin"),
            List.of("users:manage"),
            List.of("CUST-000124")
        ));

        String body = """
            {
              "userId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
            }
            """;

        mockMvc.perform(post("/api/v1/dev/session")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.authenticated").value(true))
            .andExpect(jsonPath("$.userId").value("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"));
    }

    @Test
    void postDevSession_withBlankUserId_returnsBadRequest() throws Exception {
        String body = """
            {
              "userId": ""
            }
            """;

        mockMvc.perform(post("/api/v1/dev/session")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getMeContext_returnsUnauthorizedWhenNoPrincipal() throws Exception {
        mockMvc.perform(get("/api/v1/me/context"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getMeContext_returnsContextPayloadForAuthenticatedPrincipal() throws Exception {
        UUID userId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2");

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(userId.toString(), null, List.of()));
        SecurityContextHolder.setContext(context);

        when(identityService.buildUserContext(eq(userId))).thenReturn(new MeContextResponse(
            userId,
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "user",
            List.of("user"),
            List.of("dashboard:view"),
            List.of("CUST-000124"),
            UUID.fromString("22222222-2222-2222-2222-222222222222"),
            1L,
            UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"),
            List.of(UUID.fromString("cccccccc-cccc-cccc-cccc-ccccccccccc3")),
            List.of(),
            List.of(UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"))
        ));

        mockMvc.perform(get("/api/v1/me/context"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.treeVersion").value(1))
            .andExpect(jsonPath("$.userId").value("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"));
    }
}
