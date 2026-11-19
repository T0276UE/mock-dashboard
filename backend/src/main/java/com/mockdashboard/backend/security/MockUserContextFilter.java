package com.mockdashboard.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class MockUserContextFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String userId = request.getHeader(MockUserContext.USER_HEADER);
        if (!StringUtils.hasText(userId)) {
            userId = "USR-001";
        }

        request.setAttribute(MockUserContext.REQUEST_ATTRIBUTE, new MockUserContext(userId));
        filterChain.doFilter(request, response);
    }
}
