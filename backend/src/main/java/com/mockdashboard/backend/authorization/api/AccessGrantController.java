package com.mockdashboard.backend.authorization.api;

import com.mockdashboard.backend.authorization.AuthorizationService;
import com.mockdashboard.backend.authorization.DelegationService;
import com.mockdashboard.backend.authorization.model.AccessGrant;
import com.mockdashboard.backend.authorization.model.ReplaceCustomerAccessRequest;
import com.mockdashboard.backend.authorization.model.UpdateUserAccessRequest;
import com.mockdashboard.backend.authorization.model.UserEntity;
import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@Profile("local")
@RequestMapping("/api/v1/users/authorization")
public class AccessGrantController {

    private final AuthorizationService authorizationService;
    private final DelegationService delegationService;

    public AccessGrantController(
            AuthorizationService authorizationService,
            DelegationService delegationService) {
        this.authorizationService = authorizationService;
        this.delegationService = delegationService;
    }

    @GetMapping
    public List<UserEntity> getUsers(Authentication authentication) {
        requirePermission(actorId(authentication), "users:manage");
        return authorizationService.findAllUsers();
    }

    @PatchMapping("/{userId}")
    public UserEntity updateUserAccess(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserAccessRequest request,
            Authentication authentication) {
        String actorId = actorId(authentication);
        return delegationService.updateUserAccess(
            userId,
            actorId,
            request.role(),
            request.status(),
            request.managerUserId(),
            request.permissions(),
            request.managedCustomerIds()
        );
    }

    @GetMapping("/customer-access")
    public List<AccessGrant> getCustomerAccess(Authentication authentication) {
        return delegationService.findCustomerViewGrants(actorId(authentication));
    }

    @PutMapping("/customer-access")
    public List<AccessGrant> replaceCustomerAccess(
            @Valid @RequestBody ReplaceCustomerAccessRequest request,
            Authentication authentication) {
        return delegationService.replaceCustomerViewGrants(
            request.userId(),
            actorId(authentication),
            request.customerIds()
        );
    }

    private String actorId(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated session.");
        }
        return authentication.getName();
    }

    private void requirePermission(String actorId, String permission) {
        if (!authorizationService.hasPermission(actorId, permission)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Actor lacks " + permission);
        }
    }
}
