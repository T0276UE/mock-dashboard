package com.mockdashboard.backend.authorization.security;

import com.mockdashboard.backend.authorization.AuthorizationService;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;

@Component
public class AuthorizationPermissionEvaluator implements PermissionEvaluator {

    private final AuthorizationService authorizationService;

    public AuthorizationPermissionEvaluator(AuthorizationService authorizationService) {
        this.authorizationService = authorizationService;
    }

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (authentication == null || !authentication.isAuthenticated() || targetDomainObject == null || permission == null) {
            return false;
        }
        return authorizationService.hasPermission(authentication.getName(), permission.toString());
    }

    @Override
    public boolean hasPermission(
            Authentication authentication,
            Serializable targetId,
            String targetType,
            Object permission) {
        if (authentication == null || !authentication.isAuthenticated()
                || targetId == null || targetType == null || permission == null) {
            return false;
        }
        return authorizationService.hasScopedPermission(
            authentication.getName(),
            permission.toString(),
            targetType,
            targetId.toString()
        );
    }
}
