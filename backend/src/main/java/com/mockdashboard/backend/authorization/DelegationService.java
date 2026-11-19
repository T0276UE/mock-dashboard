package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.authorization.model.AccessGrant;
import com.mockdashboard.backend.authorization.model.UserEntity;
import com.mockdashboard.backend.authorization.repository.AccessGrantRepository;
import com.mockdashboard.backend.authorization.repository.PermissionRepository;
import com.mockdashboard.backend.authorization.repository.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;

@Service
@Profile("!postgres")
public class DelegationService {

    private final AuthorizationService authorizationService;
    private final AccessGrantRepository grantRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final UserHierarchyService userHierarchyService;

    public DelegationService(
            AuthorizationService authorizationService,
            AccessGrantRepository grantRepository,
            PermissionRepository permissionRepository,
            UserRepository userRepository,
            UserHierarchyService userHierarchyService) {
        this.authorizationService = authorizationService;
        this.grantRepository = grantRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
        this.userHierarchyService = userHierarchyService;
    }

    public List<AccessGrant> findCustomerViewGrants(String actorId) {
        requirePermission(actorId, "users:manage");
        return effectiveCustomerViewGrants();
    }

    @Transactional
    public List<AccessGrant> replaceCustomerViewGrants(String userId, String grantorId, List<String> requestedCustomerIds) {
        requireUser(userId);
        requireUser(grantorId);
        requireManagedUser(grantorId, userId);

        List<String> normalizedCustomerIds = requestedCustomerIds.stream()
            .filter(customerId -> customerId != null && !customerId.isBlank())
            .map(String::trim)
            .distinct()
            .sorted()
            .toList();

        List<String> currentCustomerIds = grantRepository.findCustomerIds(userId);
        var current = new LinkedHashSet<>(currentCustomerIds);
        var effectiveCurrent = current.stream()
            .filter(customerId -> authorizationService.hasScopedPermission(
                userId,
                "customers:view",
                "customer",
                customerId
            ))
            .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        var requested = new LinkedHashSet<>(normalizedCustomerIds);

        for (String customerId : current) {
            if (!requested.contains(customerId)) {
                requireManageScope(grantorId, customerId);
                grantRepository.revokeCustomerViewGrant(userId, customerId, grantorId);
            }
        }

        for (String customerId : requested) {
            if (effectiveCurrent.contains(customerId)) {
                continue;
            }
            requireManageScope(grantorId, customerId);
            if (current.contains(customerId)) {
                grantRepository.revokeCustomerViewGrant(userId, customerId, grantorId);
            }
            long sourceGrantId = grantRepository.findActiveGrantId(grantorId, "customers:manage", customerId)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Grantor lacks customers:manage for customer " + customerId
                ));
            grantRepository.grantCustomerView(userId, customerId, grantorId, sourceGrantId);
        }

        return effectiveCustomerViewGrants().stream()
            .filter(grant -> grant.userId().equals(userId))
            .toList();
    }

    @Transactional
    public UserEntity updateUserAccess(
            String userId,
            String actorId,
            String role,
            String status,
            String managerUserId,
            List<String> permissions,
            List<String> managedCustomerIds) {
        requirePermission(actorId, "users:manage");
        requireManagedUser(actorId, userId);
        UserEntity existing = authorizationService.findUser(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));

        String updatedRole = role == null ? existing.role() : role;
        String updatedStatus = status == null ? existing.status() : status;
        String updatedManagerId = managerUserId == null ? existing.managerUserId() : managerUserId;

        if (role != null && !List.of("user", "admin").contains(updatedRole)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported role: " + updatedRole);
        }
        if ("admin".equals(updatedRole) && !"admin".equalsIgnoreCase(existing.role())) {
            List<String> adminPermissions = permissionRepository.findRolePermissions("admin");
            if (!authorizationService.findUserPermissions(actorId).containsAll(adminPermissions)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Actor cannot delegate the admin role.");
            }
        }
        if (!List.of("active", "pending", "inactive").contains(updatedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported status: " + updatedStatus);
        }
        if (userId.equals(updatedManagerId) || (updatedManagerId != null && !userRepository.exists(updatedManagerId))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid manager user: " + updatedManagerId);
        }
        if (!java.util.Objects.equals(updatedManagerId, existing.managerUserId())
                && updatedManagerId != null
                && userHierarchyService.managesUser(userId, updatedManagerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manager assignment would create a hierarchy cycle.");
        }
        if (!java.util.Objects.equals(updatedManagerId, existing.managerUserId())
                && (updatedManagerId == null
                    || (!actorId.equals(updatedManagerId) && !userHierarchyService.managesUser(actorId, updatedManagerId)))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "New manager is outside the actor's management hierarchy.");
        }

        List<String> updatedPermissions = permissions == null
            ? existing.permissions()
            : List.copyOf(new LinkedHashSet<>(permissions));
        if (permissions != null) {
            List<String> undefined = permissionRepository.findUndefinedPermissions(updatedPermissions);
            if (!undefined.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Undefined permission codes: " + String.join(", ", undefined));
            }
            List<String> unauthorized = updatedPermissions.stream()
                .filter(permission -> !authorizationService.hasPermission(actorId, permission))
                .toList();
            if (!unauthorized.isEmpty()) {
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Actor cannot assign permissions they do not possess: " + String.join(", ", unauthorized)
                );
            }
        }

        userRepository.updateProfile(userId, updatedRole, updatedStatus, updatedManagerId);
        if (permissions != null) {
            permissionRepository.replaceUserPermissions(userId, updatedPermissions);
        }
        if (managedCustomerIds != null) {
            replaceCustomerViewGrants(userId, actorId, managedCustomerIds);
        }
        return authorizationService.findUser(userId).orElseThrow();
    }

    private void requireUser(String userId) {
        UserEntity user = authorizationService.findUser(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));
        if (!"active".equalsIgnoreCase(user.status())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not active: " + userId);
        }
    }

    private void requirePermission(String actorId, String permissionCode) {
        if (!authorizationService.hasPermission(actorId, permissionCode)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Actor lacks " + permissionCode);
        }
    }

    private void requireManagedUser(String managerId, String userId) {
        if (!userHierarchyService.managesUser(managerId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Target user is outside the actor's management hierarchy.");
        }
    }

    private List<AccessGrant> effectiveCustomerViewGrants() {
        return grantRepository.findActiveCustomerViewGrants().stream()
            .filter(grant -> authorizationService.hasScopedPermission(
                grant.userId(),
                "customers:view",
                "customer",
                grant.customerId()
            ))
            .toList();
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
