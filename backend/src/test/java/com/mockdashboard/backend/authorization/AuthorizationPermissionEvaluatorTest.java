package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.authorization.security.AuthorizationPermissionEvaluator;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthorizationPermissionEvaluatorTest {

    private final AuthorizationService authorizationService = mock(AuthorizationService.class);
    private final AuthorizationPermissionEvaluator evaluator =
        new AuthorizationPermissionEvaluator(authorizationService);

    @Test
    void checksRoleOrUserPermissionForUnscopedResources() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated("USR-001", null, java.util.List.of());
        when(authorizationService.hasPermission("USR-001", "users:manage")).thenReturn(true);

        assertThat(evaluator.hasPermission(authentication, "user", "users:manage")).isTrue();
    }

    @Test
    void checksGrantForScopedResources() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated("USR-001", null, java.util.List.of());
        when(authorizationService.hasScopedPermission("USR-001", "customers:manage", "customer", "CUST-000124"))
            .thenReturn(true);

        assertThat(evaluator.hasPermission(authentication, "CUST-000124", "customer", "customers:manage")).isTrue();
    }
}
