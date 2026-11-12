package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.authorization.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserHierarchyService {

    private final UserRepository userRepository;

    public UserHierarchyService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean managesUser(String managerUserId, String userId) {
        if (managerUserId == null || userId == null || managerUserId.equals(userId)) {
            return false;
        }
        return userRepository.isInManagerHierarchy(managerUserId, userId);
    }
}
