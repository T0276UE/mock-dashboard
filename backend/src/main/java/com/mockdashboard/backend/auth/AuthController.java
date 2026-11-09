package com.mockdashboard.backend.auth;

import com.mockdashboard.backend.access.AccessService;
import com.mockdashboard.backend.access.AccessUser;
import com.mockdashboard.backend.access.SessionMeResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AccessService accessService;

    public AuthController(AccessService accessService) {
        this.accessService = accessService;
    }

    @PostMapping("/login")
    public AuthSessionResponse login(@Valid @RequestBody AuthLoginRequest request, HttpServletRequest httpRequest) {
        return authenticateAndBuildSession(request.userId(), httpRequest);
    }

    @PostMapping("/switch-user")
    public AuthSessionResponse switchUser(@Valid @RequestBody AuthLoginRequest request, HttpServletRequest httpRequest) {
        return authenticateAndBuildSession(request.userId(), httpRequest);
    }

    @GetMapping("/me")
    public AuthSessionResponse me(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated session.");
        }

        SessionMeResponse session = accessService.getSessionMe(authentication.getName());
        HttpSession httpSession = request.getSession(false);
        String issuedAt = httpSession != null ? Instant.ofEpochMilli(httpSession.getCreationTime()).toString() : Instant.now().toString();
        return toAuthSessionResponse(session, issuedAt);
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        SecurityContextHolder.clearContext();
    }

    private AuthSessionResponse authenticateAndBuildSession(String userId, HttpServletRequest request) {
        AccessUser user = accessService.findUserById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user profile."));

        if ("inactive".equalsIgnoreCase(user.status())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User profile is inactive.");
        }

        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.role().toUpperCase()));
        for (String permission : user.permissions()) {
            authorities.add(new SimpleGrantedAuthority(permission));
        }

        Authentication authentication = new UsernamePasswordAuthenticationToken(user.userId(), null, authorities);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        HttpSession session = request.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        SessionMeResponse resolvedSession = accessService.getSessionMe(user.userId());
        String issuedAt = Instant.ofEpochMilli(session.getCreationTime()).toString();
        return toAuthSessionResponse(resolvedSession, issuedAt);
    }

    private AuthSessionResponse toAuthSessionResponse(SessionMeResponse session, String issuedAt) {
        return new AuthSessionResponse(
            true,
            session.userId(),
            session.name(),
            session.role(),
            session.status(),
            session.effectiveRoles(),
            session.effectivePermissions(),
            session.managedCustomerIds(),
            issuedAt
        );
    }
}