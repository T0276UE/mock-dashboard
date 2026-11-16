package com.mockdashboard.backend.identity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mockdashboard.backend.access.AccessUser;
import com.mockdashboard.backend.access.SessionMeResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Profile("postgres")
public class IdentityService {

    private final IdentityRepository identityRepository;
    private final ObjectMapper objectMapper;

    public IdentityService(IdentityRepository identityRepository, ObjectMapper objectMapper) {
        this.identityRepository = identityRepository;
        this.objectMapper = objectMapper;
    }

    public List<DevUserSummaryResponse> listSelectableUsers() {
        List<DbUserProfile> profiles = identityRepository.findActiveUserProfiles();
        Map<UUID, Map<UUID, UUID>> managersByOrganization = new HashMap<>();

        return profiles.stream()
            .map(profile -> {
                Map<UUID, UUID> managerByUser = managersByOrganization.computeIfAbsent(
                    profile.organizationId(),
                    this::loadManagerByUser
                );
                return toUserSummary(profile, managerByUser.get(profile.id()));
            })
            .toList();
    }

    public List<AccessUser> listAccessUsers() {
        return listSelectableUsers().stream()
            .map(user -> new AccessUser(
                user.userId().toString(),
                user.displayName(),
                user.email(),
                user.managerUserId(),
                user.role(),
                user.permissions(),
                user.status()
            ))
            .toList();
    }

    public DbAppUser requireUserById(String userId) {
        UUID parsedUserId = parseUserId(userId);

        DbAppUser user = identityRepository.findUserById(parsedUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user profile."));

        if (!"ACTIVE".equalsIgnoreCase(user.status())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User profile is inactive.");
        }

        return user;
    }

    public MeContextResponse buildUserContext(UUID userId) {
        DbAppUser user = identityRepository.findUserById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authenticated user was not found."));

        DbUserProfile profile = requireUserProfile(userId);
        String role = normalizeRole(profile.role());
        List<String> permissions = permissionsForRole(role);
        List<String> customerIds = identityRepository.findCustomerIdsForUser(userId);

        ManagementTreeHead head = identityRepository.findTreeHeadByOrganizationId(user.organizationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No management tree configured for organization."));

        ManagementTreeSnapshot snapshot = identityRepository.findTreeSnapshot(head.treeId(), head.currentVersion())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Management tree snapshot not found."));

        Map<UUID, UUID> managerByUser = parseManagerByUser(snapshot.structureJson());

        UUID managerUserId = managerByUser.get(userId);
        List<UUID> directReports = managerByUser.entrySet().stream()
            .filter(entry -> userId.equals(entry.getValue()))
            .map(Map.Entry::getKey)
            .sorted()
            .toList();

        List<UUID> peers = managerByUser.entrySet().stream()
            .filter(entry -> managerUserId != null && managerUserId.equals(entry.getValue()))
            .map(Map.Entry::getKey)
            .filter(id -> !id.equals(userId))
            .sorted()
            .toList();

        List<UUID> pathToRoot = buildPathToRoot(userId, managerByUser);

        return new MeContextResponse(
            user.id(),
            user.organizationId(),
            role,
            effectiveRolesForRole(role),
            permissions,
            customerIds,
            head.treeId(),
            head.currentVersion(),
            managerUserId,
            directReports,
            peers,
            pathToRoot
        );
    }

    public SessionMeResponse buildSession(UUID userId) {
        DbUserProfile profile = requireUserProfile(userId);
        String role = normalizeRole(profile.role());
        return new SessionMeResponse(
            profile.id().toString(),
            profile.displayName(),
            role,
            normalizeStatus(profile.profileStatus(), profile.appStatus()),
            effectiveRolesForRole(role),
            permissionsForRole(role),
            identityRepository.findCustomerIdsForUser(userId)
        );
    }

    public List<String> getCustomerAccess(String userId) {
        UUID parsedUserId = parseUserId(userId);
        requireUserById(userId);
        return identityRepository.findCustomerIdsForUser(parsedUserId);
    }

    public List<String> replaceCustomerAccess(String userId, List<String> customerIds, UUID actorUserId) {
        requireAdmin(actorUserId);
        UUID parsedUserId = parseUserId(userId);
        requireUserById(userId);
        return identityRepository.replaceCustomerAccessForUser(parsedUserId, customerIds, actorUserId);
    }

    public DevUserSummaryResponse updateRole(String userId, String requestedRole, UUID actorUserId) {
        requireAdmin(actorUserId);
        UUID parsedUserId = parseUserId(userId);
        requireUserById(userId);

        String role = normalizeRole(requestedRole);
        identityRepository.updateUserRole(parsedUserId, role);
        DbUserProfile updated = requireUserProfile(parsedUserId);
        return toUserSummary(updated, loadManagerByUser(updated.organizationId()).get(parsedUserId));
    }

    public DevUserSummaryResponse updateManager(String userId, UUID managerUserId, UUID actorUserId) {
        requireAdmin(actorUserId);
        UUID parsedUserId = parseUserId(userId);
        DbAppUser target = requireUserById(userId);

        if (parsedUserId.equals(managerUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A user cannot manage themselves.");
        }

        if (managerUserId != null) {
            DbAppUser manager = requireUserById(managerUserId.toString());
            if (!target.organizationId().equals(manager.organizationId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manager must belong to the same organization.");
            }
        }

        ManagementTreeHead head = identityRepository.findTreeHeadByOrganizationId(target.organizationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No management tree configured for organization."));
        ManagementTreeSnapshot snapshot = identityRepository.findTreeSnapshot(head.treeId(), head.currentVersion())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Management tree snapshot not found."));

        Map<UUID, UUID> managerByUser = parseManagerByUser(snapshot.structureJson());
        if (Objects.equals(managerByUser.get(parsedUserId), managerUserId)) {
            return toUserSummary(requireUserProfile(parsedUserId), managerUserId);
        }

        identityRepository.findActiveUserProfiles().stream()
            .filter(profile -> target.organizationId().equals(profile.organizationId()))
            .forEach(profile -> managerByUser.putIfAbsent(profile.id(), null));
        managerByUser.put(parsedUserId, managerUserId);

        // Walking from the changed node detects assigning it beneath one of its descendants.
        buildPathToRoot(parsedUserId, managerByUser);

        String structureJson = replaceManagerMap(snapshot.structureJson(), managerByUser);
        identityRepository.publishManagementTreeSnapshot(
            head.treeId(),
            head.currentVersion(),
            structureJson,
            snapshot.schemaVersion(),
            actorUserId,
            "Reassigned manager for user " + parsedUserId
        );

        return toUserSummary(requireUserProfile(parsedUserId), managerUserId);
    }

    public void requireAdmin(UUID userId) {
        DbUserProfile profile = requireUserProfile(userId);
        if (!"admin".equals(normalizeRole(profile.role()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator role required.");
        }
    }

    public DbUserProfile requireUserProfile(UUID userId) {
        return identityRepository.findUserProfileById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile was not found."));
    }

    public List<String> permissionsForRole(String role) {
        if ("admin".equals(normalizeRole(role))) {
            return List.of("dashboard:view", "customers:manage", "vehicles:manage", "products:view", "users:manage");
        }
        return List.of("dashboard:view", "customers:view", "vehicles:view", "products:view");
    }

    public List<String> effectiveRolesForRole(String role) {
        if ("admin".equals(normalizeRole(role))) {
            return List.of("user", "admin");
        }
        return List.of("user");
    }

    private DevUserSummaryResponse toUserSummary(DbUserProfile user, UUID managerUserId) {
        String role = normalizeRole(user.role());
        return new DevUserSummaryResponse(
            user.id(),
            user.organizationId(),
            user.displayName(),
            user.email(),
            normalizeStatus(user.profileStatus(), user.appStatus()),
            role,
            permissionsForRole(role),
            managerUserId == null ? null : managerUserId.toString(),
            identityRepository.findCustomerIdsForUser(user.id())
        );
    }

    private Map<UUID, UUID> loadManagerByUser(UUID organizationId) {
        Optional<ManagementTreeHead> head = identityRepository.findTreeHeadByOrganizationId(organizationId);
        if (head.isEmpty()) {
            return new HashMap<>();
        }

        Optional<ManagementTreeSnapshot> snapshot = identityRepository.findTreeSnapshot(
            head.get().treeId(),
            head.get().currentVersion()
        );
        return snapshot.map(value -> parseManagerByUser(value.structureJson())).orElseGet(HashMap::new);
    }

    private String replaceManagerMap(String structureJson, Map<UUID, UUID> managerByUser) {
        try {
            JsonNode parsed = objectMapper.readTree(structureJson);
            if (!(parsed instanceof ObjectNode root)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid snapshot structure.");
            }

            ObjectNode managers = objectMapper.createObjectNode();
            managerByUser.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> {
                    if (entry.getValue() == null) {
                        managers.putNull(entry.getKey().toString());
                    } else {
                        managers.put(entry.getKey().toString(), entry.getValue().toString());
                    }
                });
            root.set("managerByUser", managers);
            return objectMapper.writeValueAsString(root);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid snapshot JSON format.");
        }
    }

    private UUID parseUserId(String userId) {
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId must be a UUID.");
        }
    }

    private String normalizeStatus(String profileStatus, String fallbackStatus) {
        String raw = profileStatus;
        if (raw == null || raw.isBlank()) {
            raw = fallbackStatus;
        }

        if (raw == null) {
            return "active";
        }

        String normalized = raw.trim().toLowerCase();
        return switch (normalized) {
            case "active", "pending", "inactive" -> normalized;
            case "suspended" -> "inactive";
            default -> "active";
        };
    }

    private String normalizeRole(String role) {
        return role != null && "admin".equalsIgnoreCase(role.trim()) ? "admin" : "user";
    }

    private List<String> parsePermissions(String permissionsJson) {
        if (permissionsJson == null || permissionsJson.isBlank()) {
            return List.of();
        }

        try {
            JsonNode parsed = objectMapper.readTree(permissionsJson);
            if (!parsed.isArray()) {
                return List.of();
            }

            List<String> permissions = new ArrayList<>();
            parsed.forEach(node -> {
                if (node.isTextual()) {
                    permissions.add(node.asText());
                }
            });
            return permissions;
        } catch (IOException ignored) {
            return List.of();
        }
    }

    private Map<UUID, UUID> parseManagerByUser(String structureJson) {
        try {
            JsonNode root = objectMapper.readTree(structureJson);
            JsonNode managerByUserNode = root.path("managerByUser");

            if (!managerByUserNode.isObject()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid snapshot structure: managerByUser object missing.");
            }

            Map<UUID, UUID> managerByUser = new HashMap<>();
            managerByUserNode.fields().forEachRemaining(field -> {
                UUID subjectId;
                try {
                    subjectId = UUID.fromString(field.getKey());
                } catch (IllegalArgumentException exception) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid UUID in managerByUser key: " + field.getKey());
                }

                JsonNode managerNode = field.getValue();
                if (managerNode == null || managerNode.isNull()) {
                    managerByUser.put(subjectId, null);
                    return;
                }

                String managerValue = managerNode.asText();
                if (managerValue == null || managerValue.isBlank()) {
                    managerByUser.put(subjectId, null);
                    return;
                }

                try {
                    managerByUser.put(subjectId, UUID.fromString(managerValue));
                } catch (IllegalArgumentException exception) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid UUID in managerByUser value: " + managerValue);
                }
            });

            return managerByUser;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid snapshot JSON format.");
        }
    }

    private List<UUID> buildPathToRoot(UUID userId, Map<UUID, UUID> managerByUser) {
        List<UUID> path = new ArrayList<>();
        Set<UUID> visited = new LinkedHashSet<>();
        UUID current = managerByUser.get(userId);

        while (current != null) {
            if (!visited.add(current)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Management tree contains a cycle.");
            }

            path.add(current);
            current = managerByUser.get(current);
        }

        return path;
    }
}
