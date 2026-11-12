package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.authorization.model.UserEntity;
import com.mockdashboard.backend.authorization.repository.PermissionRepository;
import com.mockdashboard.backend.authorization.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AuthorizationService {

    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;

    public AuthorizationService(UserRepository userRepository, PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
    }

    public List<UserEntity> findAllUsers() {
        return userRepository.findAll();
    }

    public Optional<UserEntity> findUser(String userId) {
        return userRepository.findById(userId);
    }

    public boolean hasPermission(String userId, String permissionCode) {
        return userRepository.findById(userId)
            .map(user -> permissionRepository.hasUserPermission(userId, user.role(), permissionCode))
            .orElse(false);
    }

    public boolean hasScopedPermission(String userId, String permissionCode, String resourceType, String resourceId) {
        return permissionRepository.hasScopedGrant(userId, permissionCode, resourceType, resourceId);
    }

    public List<String> findUserPermissions(String userId) {
        return permissionRepository.findUserPermissions(userId);
    }
}
