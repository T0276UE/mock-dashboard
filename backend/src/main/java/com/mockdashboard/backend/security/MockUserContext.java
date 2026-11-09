package com.mockdashboard.backend.security;

public record MockUserContext(String userId) {
    public static final String REQUEST_ATTRIBUTE = "mockUserContext";
    public static final String USER_HEADER = "x-user-id";
}
