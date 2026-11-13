package com.mockdashboard.backend.identity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
        return identityRepository.findActiveUserProfiles()
            .stream()
            .map(user -> new DevUserSummaryResponse(
                user.id(),
                user.organizationId(),
                user.displayName(),
                user.email(),
                normalizeStatus(user.profileStatus(), user.appStatus()),
                normalizeRole(user.role()),
                parsePermissions(user.permissionsJson()),
                user.managerUserId()
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
            head.treeId(),
            head.currentVersion(),
            managerUserId,
            directReports,
            peers,
            pathToRoot
        );
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
        if (role == null) {
            return "user";
        }

        String normalized = role.trim().toLowerCase();
        return switch (normalized) {
            case "admin", "sysadmin", "user" -> normalized;
            default -> "user";
        };
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
