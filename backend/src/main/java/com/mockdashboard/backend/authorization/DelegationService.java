package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.authorization.model.AccessGrant;
import com.mockdashboard.backend.authorization.model.UserEntity;
import com.mockdashboard.backend.authorization.repository.AccessGrantRepository;
import com.mockdashboard.backend.authorization.repository.PermissionRepository;
import com.mockdashboard.backend.authorization.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;

@Service
public class DelegationService {

    private final AuthorizationService authorizationService;
    private final AccessGrantRepository grantRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    public DelegationService(
            AuthorizationService authorizationService,
            AccessGrantRepository grantRepository,
            PermissionRepository permissionRepository,
            UserRepository userRepository) {
        this.authorizationService = authorizationService;
        this.grantRepository = grantRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
    }

    public List<AccessGrant> findCustomerViewGrants() {
        return grantRepository.findActiveCustomerViewGrants();
    }

    @Transactional
    public List<AccessGrant> replaceCustomerViewGrants(String userId, String grantorId, List<String> requestedCustomerIds) {
        requireUser(userId);
        requireUser(grantorId);

        List<String> normalizedCustomerIds = requestedCustomerIds.stream()
            .filter(customerId -> customerId != null && !customerId.isBlank())
            .map(String::trim)
            .distinct()
            .sorted()
            .toList();

        List<String> currentCustomerIds = grantRepository.findCustomerIds(userId);
        var current = new LinkedHashSet<>(currentCustomerIds);
        var requested = new LinkedHashSet<>(normalizedCustomerIds);

        for (String customerId : current) {
            if (!requested.contains(customerId)) {
                requireManageScope(grantorId, customerId);
                grantRepository.revokeCustomerViewGrant(userId, customerId, grantorId);
            }
        }

        for (String customerId : requested) {
            if (current.contains(customerId)) {
                continue;
            }
            requireManageScope(grantorId, customerId);
            long sourceGrantId = grantRepository.findActiveGrantId(grantorId, "customers:manage", customerId)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Grantor lacks customers:manage for customer " + customerId
                ));
            grantRepository.grantCustomerView(userId, customerId, grantorId, sourceGrantId);
        }

        return grantRepository.findActiveCustomerViewGrants().stream()
            .filter(grant -> grant.userId().equals(userId))
            .toList();
    }

    @Transactional
    public UserEntity updateUserAccess(String userId, String role, String status, String managerUserId, List<String> permissions) {
        UserEntity existing = authorizationService.findUser(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));

        String updatedRole = role == null ? existing.role() : role;
        String updatedStatus = status == null ? existing.status() : status;
        String updatedManagerId = managerUserId == null ? existing.managerUserId() : managerUserId;

        if (!List.of("user", "admin", "sysadmin").contains(updatedRole)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported role: " + updatedRole);
        }
        if (!List.of("active", "pending", "inactive").contains(updatedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported status: " + updatedStatus);
        }
        if (userId.equals(updatedManagerId) || (updatedManagerId != null && !userRepository.exists(updatedManagerId))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid manager user: " + updatedManagerId);
        }

        List<String> updatedPermissions = permissions == null
            ? existing.permissions()
            : List.copyOf(new LinkedHashSet<>(permissions));
        if (permissions != null) {
            List<String> undefined = permissionRepository.findUndefinedPermissions(updatedPermissions);
            if (!undefined.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Undefined permission codes: " + String.join(", ", undefined));
            }
        }

        userRepository.updateProfile(userId, updatedRole, updatedStatus, updatedManagerId);
        if (permissions != null) {
            permissionRepository.replaceUserPermissions(userId, updatedPermissions);
        }
        return authorizationService.findUser(userId).orElseThrow();
    }

    private void requireUser(String userId) {
        if (!userRepository.exists(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId);
        }
    }

    private void requireManageScope(String grantorId, String customerId) {
        if (!authorizationService.hasScopedPermission(grantorId, "customers:manage", "customer", customerId)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Grantor lacks customers:manage for customer " + customerId
            );
        }
    }
}
