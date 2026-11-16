package com.mockdashboard.backend.access;

import com.mockdashboard.backend.identity.DevUserSummaryResponse;
import com.mockdashboard.backend.identity.IdentityService;
import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@Profile("postgres")
public class PostgresAccessController {

    private final IdentityService identityService;

    public PostgresAccessController(IdentityService identityService) {
        this.identityService = identityService;
    }

    @GetMapping("/api/v1/session/me")
    public SessionMeResponse getSessionMe(Authentication authentication) {
        return identityService.buildSession(currentUserId(authentication));
    }

    @GetMapping("/api/v1/users")
    public List<AccessUser> getUsers() {
        return identityService.listAccessUsers();
    }

    @GetMapping("/api/v1/users/{userId}/customers")
    public List<String> getUserCustomers(@PathVariable String userId) {
        return identityService.getCustomerAccess(userId);
    }

    @PutMapping("/api/v1/users/{userId}/customers")
    public List<String> replaceUserCustomers(
        @PathVariable String userId,
        @Valid @RequestBody UpdateUserCustomersRequest request,
        Authentication authentication
    ) {
        return identityService.replaceCustomerAccess(userId, request.customerIds(), currentUserId(authentication));
    }

    @PutMapping("/api/v1/users/{userId}/role")
    public DevUserSummaryResponse updateUserRole(
        @PathVariable String userId,
        @Valid @RequestBody UpdateUserRoleRequest request,
        Authentication authentication
    ) {
        return identityService.updateRole(userId, request.role(), currentUserId(authentication));
    }

    @PutMapping("/api/v1/users/{userId}/manager")
    public DevUserSummaryResponse updateUserManager(
        @PathVariable String userId,
        @RequestBody UpdateUserManagerRequest request,
        Authentication authentication
    ) {
        return identityService.updateManager(userId, request.managerUserId(), currentUserId(authentication));
    }

    private UUID currentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated session.");
        }

        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authenticated principal.");
        }
    }
}
