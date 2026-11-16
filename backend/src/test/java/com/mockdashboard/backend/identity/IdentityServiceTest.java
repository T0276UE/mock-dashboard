package com.mockdashboard.backend.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IdentityServiceTest {

    @Mock
    private IdentityRepository identityRepository;

    private IdentityService identityService;

    @BeforeEach
    void setUp() {
        identityService = new IdentityService(identityRepository, new ObjectMapper());
    }

    @Test
    void requireUserById_rejectsInvalidUuid() {
        assertThatThrownBy(() -> identityService.requireUserById("not-a-uuid"))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies((error) -> {
                ResponseStatusException ex = (ResponseStatusException) error;
                assertThat(ex.getStatusCode().value()).isEqualTo(400);
            });
    }

    @Test
    void requireUserById_rejectsInactiveUsers() {
        UUID userId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");
        DbAppUser inactiveUser = new DbAppUser(
            userId,
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Alice Patel",
            "alice@example.com",
            "INACTIVE"
        );

        when(identityRepository.findUserById(eq(userId))).thenReturn(Optional.of(inactiveUser));

        assertThatThrownBy(() -> identityService.requireUserById(userId.toString()))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies((error) -> {
                ResponseStatusException ex = (ResponseStatusException) error;
                assertThat(ex.getStatusCode().value()).isEqualTo(403);
            });
    }

    @Test
    void buildUserContext_buildsImmediateRelationsAndPathToRoot() {
        UUID orgId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID treeId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID managerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");
        UUID userId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2");
        UUID directReportId = UUID.fromString("cccccccc-cccc-cccc-cccc-ccccccccccc3");
        UUID peerId = UUID.fromString("dddddddd-dddd-dddd-dddd-ddddddddddd4");

        when(identityRepository.findUserById(eq(userId))).thenReturn(Optional.of(new DbAppUser(
            userId,
            orgId,
            "Morgan Lee",
            "morgan@example.com",
            "ACTIVE"
        )));
        when(identityRepository.findUserProfileById(eq(userId))).thenReturn(Optional.of(new DbUserProfile(
            userId, orgId, "Morgan Lee", "morgan@example.com", "ACTIVE", "user", "[]", null, "active"
        )));
        when(identityRepository.findCustomerIdsForUser(eq(userId))).thenReturn(List.of("CUST-000124"));
        when(identityRepository.findTreeHeadByOrganizationId(eq(orgId))).thenReturn(Optional.of(new ManagementTreeHead(treeId, orgId, 1L)));
        when(identityRepository.findTreeSnapshot(eq(treeId), eq(1L))).thenReturn(Optional.of(new ManagementTreeSnapshot(
            "{" +
                "\"managerByUser\":{" +
                "\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1\":null," +
                "\"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1\"," +
                "\"cccccccc-cccc-cccc-cccc-ccccccccccc3\":\"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2\"," +
                "\"dddddddd-dddd-dddd-dddd-ddddddddddd4\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1\"}" +
                "}",
            1
        )));

        MeContextResponse response = identityService.buildUserContext(userId);

        assertThat(response.userId()).isEqualTo(userId);
        assertThat(response.treeId()).isEqualTo(treeId);
        assertThat(response.treeVersion()).isEqualTo(1L);
        assertThat(response.managerUserId()).isEqualTo(managerId);
        assertThat(response.directReportUserIds()).containsExactly(directReportId);
        assertThat(response.peerUserIds()).containsExactly(peerId);
        assertThat(response.pathToRootUserIds()).containsExactly(managerId);
    }

    @Test
    void buildUserContext_rejectsCycleInManagerHierarchy() {
        UUID orgId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID treeId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID userId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2");
        UUID managerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");

        when(identityRepository.findUserById(eq(userId))).thenReturn(Optional.of(new DbAppUser(
            userId,
            orgId,
            "Morgan Lee",
            "morgan@example.com",
            "ACTIVE"
        )));
        when(identityRepository.findUserProfileById(eq(userId))).thenReturn(Optional.of(new DbUserProfile(
            userId, orgId, "Morgan Lee", "morgan@example.com", "ACTIVE", "user", "[]", null, "active"
        )));
        when(identityRepository.findCustomerIdsForUser(eq(userId))).thenReturn(List.of());
        when(identityRepository.findTreeHeadByOrganizationId(eq(orgId))).thenReturn(Optional.of(new ManagementTreeHead(treeId, orgId, 1L)));
        when(identityRepository.findTreeSnapshot(eq(treeId), eq(1L))).thenReturn(Optional.of(new ManagementTreeSnapshot(
            "{" +
                "\"managerByUser\":{" +
                "\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1\":\"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2\"," +
                "\"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1\"}" +
                "}",
            1
        )));

        assertThatThrownBy(() -> identityService.buildUserContext(userId))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies((error) -> {
                ResponseStatusException ex = (ResponseStatusException) error;
                assertThat(ex.getStatusCode().value()).isEqualTo(422);
            });
    }

    @Test
    void buildUserContext_rejectsInvalidManagerUuid() {
        UUID orgId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID treeId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID userId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2");

        when(identityRepository.findUserById(eq(userId))).thenReturn(Optional.of(new DbAppUser(
            userId,
            orgId,
            "Morgan Lee",
            "morgan@example.com",
            "ACTIVE"
        )));
        when(identityRepository.findUserProfileById(eq(userId))).thenReturn(Optional.of(new DbUserProfile(
            userId, orgId, "Morgan Lee", "morgan@example.com", "ACTIVE", "user", "[]", null, "active"
        )));
        when(identityRepository.findCustomerIdsForUser(eq(userId))).thenReturn(List.of());
        when(identityRepository.findTreeHeadByOrganizationId(eq(orgId))).thenReturn(Optional.of(new ManagementTreeHead(treeId, orgId, 1L)));
        when(identityRepository.findTreeSnapshot(eq(treeId), eq(1L))).thenReturn(Optional.of(new ManagementTreeSnapshot(
            "{" +
                "\"managerByUser\":{" +
                "\"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2\":\"not-a-uuid\"}" +
                "}",
            1
        )));

        assertThatThrownBy(() -> identityService.buildUserContext(userId))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies((error) -> {
                ResponseStatusException ex = (ResponseStatusException) error;
                assertThat(ex.getStatusCode().value()).isEqualTo(422);
            });
    }

    @Test
    void updateManager_publishesANewSnapshot() {
        UUID orgId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID treeId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID actorId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");
        UUID targetId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2");
        UUID managerId = UUID.fromString("cccccccc-cccc-cccc-cccc-ccccccccccc3");

        when(identityRepository.findUserProfileById(actorId)).thenReturn(Optional.of(profile(actorId, orgId, "Admin", "admin")));
        when(identityRepository.findUserById(targetId)).thenReturn(Optional.of(user(targetId, orgId, "Target")));
        when(identityRepository.findUserById(managerId)).thenReturn(Optional.of(user(managerId, orgId, "Manager")));
        when(identityRepository.findTreeHeadByOrganizationId(orgId)).thenReturn(Optional.of(new ManagementTreeHead(treeId, orgId, 4L)));
        when(identityRepository.findTreeSnapshot(treeId, 4L)).thenReturn(Optional.of(new ManagementTreeSnapshot(
            "{\"managerByUser\":{\"" + actorId + "\":null,\"" + targetId + "\":\"" + actorId + "\",\"" + managerId + "\":\"" + actorId + "\"}}",
            1
        )));
        when(identityRepository.findActiveUserProfiles()).thenReturn(List.of(
            profile(actorId, orgId, "Admin", "admin"),
            profile(targetId, orgId, "Target", "user"),
            profile(managerId, orgId, "Manager", "user")
        ));
        when(identityRepository.publishManagementTreeSnapshot(eq(treeId), eq(4L), anyString(), eq(1), eq(actorId), anyString()))
            .thenReturn(5L);
        when(identityRepository.findUserProfileById(targetId)).thenReturn(Optional.of(profile(targetId, orgId, "Target", "user")));
        when(identityRepository.findCustomerIdsForUser(targetId)).thenReturn(List.of());

        DevUserSummaryResponse response = identityService.updateManager(targetId.toString(), managerId, actorId);

        assertThat(response.managerUserId()).isEqualTo(managerId.toString());
        verify(identityRepository).publishManagementTreeSnapshot(eq(treeId), eq(4L), anyString(), eq(1), eq(actorId), anyString());
    }

    @Test
    void updateManager_rejectsHierarchyCycle() {
        UUID orgId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID treeId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID actorId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");
        UUID targetId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2");
        UUID descendantId = UUID.fromString("cccccccc-cccc-cccc-cccc-ccccccccccc3");

        when(identityRepository.findUserProfileById(actorId)).thenReturn(Optional.of(profile(actorId, orgId, "Admin", "admin")));
        when(identityRepository.findUserById(targetId)).thenReturn(Optional.of(user(targetId, orgId, "Target")));
        when(identityRepository.findUserById(descendantId)).thenReturn(Optional.of(user(descendantId, orgId, "Descendant")));
        when(identityRepository.findTreeHeadByOrganizationId(orgId)).thenReturn(Optional.of(new ManagementTreeHead(treeId, orgId, 2L)));
        when(identityRepository.findTreeSnapshot(treeId, 2L)).thenReturn(Optional.of(new ManagementTreeSnapshot(
            "{\"managerByUser\":{\"" + actorId + "\":null,\"" + targetId + "\":\"" + actorId + "\",\"" + descendantId + "\":\"" + targetId + "\"}}",
            1
        )));
        when(identityRepository.findActiveUserProfiles()).thenReturn(List.of(
            profile(actorId, orgId, "Admin", "admin"),
            profile(targetId, orgId, "Target", "user"),
            profile(descendantId, orgId, "Descendant", "user")
        ));

        assertThatThrownBy(() -> identityService.updateManager(targetId.toString(), descendantId, actorId))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(422));
        verify(identityRepository, never()).publishManagementTreeSnapshot(eq(treeId), eq(2L), anyString(), eq(1), eq(actorId), anyString());
    }

    private DbAppUser user(UUID id, UUID organizationId, String name) {
        return new DbAppUser(id, organizationId, name, name.toLowerCase() + "@example.com", "ACTIVE");
    }

    private DbUserProfile profile(UUID id, UUID organizationId, String name, String role) {
        return new DbUserProfile(
            id,
            organizationId,
            name,
            name.toLowerCase() + "@example.com",
            "ACTIVE",
            role,
            "[]",
            null,
            "active"
        );
    }
}
