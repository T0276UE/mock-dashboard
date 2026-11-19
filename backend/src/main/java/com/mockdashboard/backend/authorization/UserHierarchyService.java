package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.access.AccessUser;
import com.mockdashboard.backend.authorization.repository.UserRepository;
import com.mockdashboard.backend.identity.IdentityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Service
public class UserHierarchyService {

    private final IdentityService identityService;
    private final UserRepository userRepository;

    @Autowired
    public UserHierarchyService(
            ObjectProvider<IdentityService> identityServiceProvider,
            ObjectProvider<UserRepository> userRepositoryProvider) {
        this(identityServiceProvider.getIfAvailable(), userRepositoryProvider.getIfAvailable());
    }

    UserHierarchyService(IdentityService identityService, UserRepository userRepository) {
        this.identityService = identityService;
        this.userRepository = userRepository;
    }

    public boolean managesUser(String managerUserId, String userId) {
        if (managerUserId == null || userId == null || managerUserId.equals(userId)) {
            return false;
        }

        if (identityService != null) {
            return managesUserInActiveTree(managerUserId, userId);
        }
        if (userRepository != null) {
            return userRepository.isInManagerHierarchy(managerUserId, userId);
        }
        throw new IllegalStateException("No management hierarchy implementation is available.");
    }

    private boolean managesUserInActiveTree(String managerUserId, String userId) {
        Map<String, String> managerByUser = new HashMap<>();
        for (AccessUser user : identityService.listAccessUsers()) {
            managerByUser.put(user.userId(), user.managerUserId());
        }
        if (!managerByUser.containsKey(managerUserId) || !managerByUser.containsKey(userId)) {
            return false;
        }

        Set<String> visited = new HashSet<>();
        visited.add(userId);
        boolean managesTarget = false;
        String currentManagerId = managerByUser.get(userId);
        while (currentManagerId != null) {
            if (!visited.add(currentManagerId)) {
                return false;
            }
            managesTarget |= managerUserId.equals(currentManagerId);
            currentManagerId = managerByUser.get(currentManagerId);
        }
        return managesTarget;
    }
}
