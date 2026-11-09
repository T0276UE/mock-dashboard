package com.mockdashboard.backend.access;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UsersController {

    private final AccessService accessService;

    public UsersController(AccessService accessService) {
        this.accessService = accessService;
    }

    @GetMapping
    public List<AccessUser> getUsers() {
        return accessService.findAllUsers();
    }

    @GetMapping("/{userId}/customers")
    public List<String> getUserCustomers(@PathVariable String userId) {
        requireUserExists(userId);
        return accessService.findCustomerIdsForUser(userId);
    }

    @PutMapping("/{userId}/customers")
    @ResponseStatus(HttpStatus.OK)
    public List<String> replaceUserCustomers(@PathVariable String userId, @Valid @RequestBody UpdateUserCustomersRequest request) {
        requireUserExists(userId);
        return accessService.replaceCustomerAccessForUser(userId, request.customerIds());
    }

    private void requireUserExists(String userId) {
        if (accessService.findUserById(userId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId);
        }
    }
}