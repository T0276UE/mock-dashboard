package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.authorization.model.AccessGrant;
import com.mockdashboard.backend.authorization.model.UserEntity;
import com.mockdashboard.backend.authorization.repository.AccessGrantRepository;
import com.mockdashboard.backend.authorization.repository.PermissionRepository;
import com.mockdashboard.backend.authorization.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DelegationServiceTest {

    private final AuthorizationServiceStub authorizationService = new AuthorizationServiceStub();
    private final AccessGrantRepositoryStub grantRepository = new AccessGrantRepositoryStub();
    private final PermissionRepositoryStub permissionRepository = new PermissionRepositoryStub();
    private final UserRepositoryStub userRepository = new UserRepositoryStub(permissionRepository);
    private final UserHierarchyServiceStub userHierarchyService = new UserHierarchyServiceStub();
    private final DelegationService service = new DelegationService(
        authorizationService,
        grantRepository,
        permissionRepository,
        userRepository,
        userHierarchyService
    );

    @Test
    void rejectsCustomerGrantOutsideManagersHierarchy() {
        authorizationService.users.put("manager", activeUser("manager", null));
        authorizationService.users.put("peer", activeUser("peer", null));

        assertThatThrownBy(() -> service.replaceCustomerViewGrants("peer", "manager", List.of("customer-1")))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
            .extracting(exception ->
                ((org.springframework.web.server.ResponseStatusException) exception).getStatusCode().value())
            .isEqualTo(403);

        org.assertj.core.api.Assertions.assertThat(grantRepository.grantCreated).isFalse();
    }

    @Test
    void doesNotReturnGrantsWhoseSourcePermissionIsNoLongerEffective() {
        authorizationService.permissions.add("users:manage");
        AccessGrant effective = new AccessGrant(1L, "child", "customer-1", "manager", null, null, null);
        AccessGrant stale = new AccessGrant(2L, "child", "customer-2", "manager", 1L, null, null);
        grantRepository.activeGrants = List.of(effective, stale);
        authorizationService.scopedPermissions.add(scope("child", "customer-1"));

        assertThat(service.findCustomerViewGrants("manager")).containsExactly(effective);
    }

    @Test
    void cannotAssignPermissionsTheActorDoesNotPossess() {
        authorizationService.users.put("manager", activeUser("manager", null));
        authorizationService.users.put("child", activeUser("child", "manager"));
        authorizationService.permissions.add("users:manage");
        userHierarchyService.managesTarget = true;

        assertThatThrownBy(() -> service.updateUserAccess(
                "child",
                "manager",
                null,
                null,
                null,
                List.of("vehicles:manage"),
                null))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
            .extracting(exception ->
                ((org.springframework.web.server.ResponseStatusException) exception).getStatusCode().value())
            .isEqualTo(403);

        org.assertj.core.api.Assertions.assertThat(userRepository.profileUpdated).isFalse();
    }

    @Test
    void cannotDelegateAdminRoleWithoutAllAdminPermissions() {
        authorizationService.users.put("manager", activeUser("manager", null));
        authorizationService.users.put("child", activeUser("child", "manager"));
        authorizationService.permissions.add("users:manage");
        userHierarchyService.managesTarget = true;

        assertThatThrownBy(() -> service.updateUserAccess(
                "child",
                "manager",
                "admin",
                null,
                null,
                null,
                null))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
            .extracting(exception ->
                ((org.springframework.web.server.ResponseStatusException) exception).getStatusCode().value())
            .isEqualTo(403);

        org.assertj.core.api.Assertions.assertThat(userRepository.profileUpdated).isFalse();
    }

    private UserEntity activeUser(String userId, String managerUserId) {
        return new UserEntity(userId, userId, userId + "@example.com", managerUserId, "user", List.of(), "active");
    }

    private String scope(String userId, String resourceId) {
        return userId + ":customer:" + resourceId + ":customers:view";
    }

    private static class AuthorizationServiceStub extends AuthorizationService {
        private final java.util.Map<String, UserEntity> users = new java.util.HashMap<>();
        private final java.util.Set<String> permissions = new java.util.HashSet<>();
        private final java.util.Set<String> scopedPermissions = new java.util.HashSet<>();

        private AuthorizationServiceStub() {
            super(null, null);
        }

        @Override
        public boolean hasPermission(String userId, String permissionCode) {
            return permissions.contains(permissionCode);
        }

        @Override
        public boolean hasScopedPermission(String userId, String permissionCode, String resourceType, String resourceId) {
            return scopedPermissions.contains(
                userId + ":" + resourceType + ":" + resourceId + ":" + permissionCode
            );
        }

        @Override
        public Optional<UserEntity> findUser(String userId) {
            return Optional.ofNullable(users.get(userId));
        }

        @Override
        public List<String> findUserPermissions(String userId) {
            return List.copyOf(permissions);
        }
    }

    private static class AccessGrantRepositoryStub extends AccessGrantRepository {
        private boolean grantCreated;
        private List<AccessGrant> activeGrants = List.of();

        private AccessGrantRepositoryStub() {
            super(null);
        }

        @Override
        public List<AccessGrant> findActiveCustomerViewGrants() {
            return activeGrants;
        }

        @Override
        public List<String> findCustomerIds(String userId) {
            return List.of();
        }

        @Override
        public Optional<Long> findActiveGrantId(String granteeId, String permissionCode, String customerId) {
            return Optional.empty();
        }

        @Override
        public long grantCustomerView(String userId, String customerId, String grantorId, long sourceGrantId) {
            grantCreated = true;
            return 1L;
        }
    }

    private static class PermissionRepositoryStub extends PermissionRepository {
        private PermissionRepositoryStub() {
            super(null);
        }

        @Override
        public List<String> findUndefinedPermissions(List<String> codes) {
            return List.of();
        }

        @Override
        public List<String> findRolePermissions(String roleCode) {
            return List.of("users:manage", "customers:manage");
        }
    }

    private static class UserRepositoryStub extends UserRepository {
        private boolean profileUpdated;

        private UserRepositoryStub(PermissionRepository permissionRepository) {
            super(null, permissionRepository);
        }

        @Override
        public boolean exists(String userId) {
            return true;
        }

        @Override
        public void updateProfile(String userId, String role, String status, String managerUserId) {
            profileUpdated = true;
        }
    }

    private static class UserHierarchyServiceStub extends UserHierarchyService {
        private boolean managesTarget;

        private UserHierarchyServiceStub() {
            super((com.mockdashboard.backend.identity.IdentityService) null, (UserRepository) null);
        }

        @Override
        public boolean managesUser(String managerUserId, String userId) {
            return managesTarget;
        }
    }
}
