package com.mockdashboard.backend.authorization.api;

import com.mockdashboard.backend.authorization.AuthorizationService;
import com.mockdashboard.backend.authorization.DelegationService;
import com.mockdashboard.backend.authorization.model.AccessGrant;
import com.mockdashboard.backend.authorization.model.ReplaceCustomerAccessRequest;
import com.mockdashboard.backend.authorization.model.UpdateUserAccessRequest;
import com.mockdashboard.backend.authorization.model.UserEntity;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Profile("local")
@RequestMapping("/api/v1/users/authorization")
public class AccessGrantController {

    private final AuthorizationService authorizationService;
    private final DelegationService delegationService;
    private final String localActorUserId;

    public AccessGrantController(
            AuthorizationService authorizationService,
            DelegationService delegationService,
            @Value("${authorization.local-actor-user-id:USR-001}") String localActorUserId) {
        this.authorizationService = authorizationService;
        this.delegationService = delegationService;
        this.localActorUserId = localActorUserId;
    }

    @GetMapping
    public List<UserEntity> getUsers() {
        return authorizationService.findAllUsers();
    }

    @PatchMapping("/{userId}")
    public UserEntity updateUserAccess(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserAccessRequest request) {
        if (request.managedCustomerIds() != null) {
            delegationService.replaceCustomerViewGrants(userId, localActorUserId, request.managedCustomerIds());
        }
        return delegationService.updateUserAccess(
            userId,
            request.role(),
            request.status(),
            request.managerUserId(),
            request.permissions()
        );
    }

    @GetMapping("/customer-access")
    public List<AccessGrant> getCustomerAccess() {
        return delegationService.findCustomerViewGrants();
    }

    @PutMapping("/customer-access")
    public List<AccessGrant> replaceCustomerAccess(@Valid @RequestBody ReplaceCustomerAccessRequest request) {
        return delegationService.replaceCustomerViewGrants(
            request.userId(),
            localActorUserId,
            request.customerIds()
        );
    }
}
