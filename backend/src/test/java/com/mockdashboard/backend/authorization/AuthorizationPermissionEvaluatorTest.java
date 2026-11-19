package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.authorization.security.AuthorizationPermissionEvaluator;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.assertj.core.api.Assertions.assertThat;

class AuthorizationPermissionEvaluatorTest {

    private final AuthorizationService authorizationService = new AuthorizationService(null, null) {
        @Override
        public boolean hasScopedPermission(String userId, String permissionCode, String resourceType, String resourceId) {
            return "USR-001".equals(userId)
                && "customers:manage".equals(permissionCode)
                && "customer".equals(resourceType)
                && "CUST-000124".equals(resourceId);
        }
    };
    private final AuthorizationPermissionEvaluator evaluator =
        new AuthorizationPermissionEvaluator(authorizationService);

    @Test
    void deniesUnscopedPermissionChecks() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated("USR-001", null, java.util.List.of());

        assertThat(evaluator.hasPermission(authentication, "user", "users:manage")).isFalse();
    }

    @Test
    void checksGrantForScopedResources() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated("USR-001", null, java.util.List.of());

        assertThat(evaluator.hasPermission(authentication, "CUST-000124", "customer", "customers:manage")).isTrue();
    }
}
