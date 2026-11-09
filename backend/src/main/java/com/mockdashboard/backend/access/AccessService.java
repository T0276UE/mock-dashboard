package com.mockdashboard.backend.access;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AccessService {

    private final Map<String, AccessUser> users = new LinkedHashMap<>();
    private final Map<String, Set<String>> customerAccessByUser = new LinkedHashMap<>();

    @PostConstruct
    void seed() {
        users.put("USR-001", new AccessUser("USR-001", "Alice Patel", "alice@example.com", null, "admin", List.of("dashboard:view", "customers:manage", "vehicles:manage", "users:manage"), "active"));
        users.put("USR-002", new AccessUser("USR-002", "Bob Stone", "bob@example.com", "USR-001", "sysadmin", List.of("dashboard:view", "customers:manage", "vehicles:view", "users:manage"), "active"));
        users.put("USR-003", new AccessUser("USR-003", "Carol Lee", "carol@example.com", "USR-001", "user", List.of("dashboard:view", "customers:view"), "active"));
        users.put("USR-004", new AccessUser("USR-004", "David Raj", "david@example.com", "USR-002", "user", List.of("dashboard:view", "vehicles:view"), "pending"));
        users.put("USR-005", new AccessUser("USR-005", "Eva Martinez", "eva@example.com", null, "admin", List.of("dashboard:view", "customers:manage", "vehicles:manage", "users:manage"), "active"));

        customerAccessByUser.put("USR-001", new LinkedHashSet<>(List.of("CUST-000124", "CUST-000208", "CUST-000311", "CUST-000415", "CUST-000509", "CUST-000622", "CUST-000714", "CUST-000801")));
        customerAccessByUser.put("USR-002", new LinkedHashSet<>(List.of("CUST-000124", "CUST-000208", "CUST-000311", "CUST-000415")));
        customerAccessByUser.put("USR-003", new LinkedHashSet<>(List.of("CUST-000124", "CUST-000208")));
        customerAccessByUser.put("USR-004", new LinkedHashSet<>(List.of("CUST-000415", "CUST-000509")));
        customerAccessByUser.put("USR-005", new LinkedHashSet<>(List.of("CUST-000622", "CUST-000714", "CUST-000801")));
    }

    public List<AccessUser> findAllUsers() {
        return new ArrayList<>(users.values());
    }

    public Optional<AccessUser> findUserById(String userId) {
        return Optional.ofNullable(users.get(userId));
    }

    public SessionMeResponse getSessionMe(String userId) {
        AccessUser user = users.getOrDefault(userId, users.get("USR-001"));
        List<String> customerIds = findCustomerIdsForUser(user.userId());

        return new SessionMeResponse(
            user.userId(),
            user.name(),
            user.role(),
            user.status(),
            List.of(user.role()),
            user.permissions(),
            customerIds
        );
    }

    public List<String> findCustomerIdsForUser(String userId) {
        return new ArrayList<>(customerAccessByUser.getOrDefault(userId, new LinkedHashSet<>()));
    }

    public List<String> replaceCustomerAccessForUser(String userId, List<String> nextCustomerIds) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String customerId : nextCustomerIds) {
            if (customerId != null && !customerId.isBlank()) {
                normalized.add(customerId.trim());
            }
        }

        customerAccessByUser.put(userId, normalized);
        return new ArrayList<>(normalized);
    }
}
