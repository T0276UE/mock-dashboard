package com.mockdashboard.backend.identity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
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
import java.util.List;
import java.util.UUID;

@RestController
@Profile("postgres")
public class DevSessionController {

    private final IdentityService identityService;

    public DevSessionController(IdentityService identityService) {
        this.identityService = identityService;
    }

    @GetMapping("/api/v1/dev/users")
    public List<DevUserSummaryResponse> listUsers() {
        return identityService.listSelectableUsers();
    }

    @PostMapping("/api/v1/dev/session")
    public DevSessionResponse createOrSwitchSession(@Valid @RequestBody DevSessionRequest request, HttpServletRequest httpServletRequest) {
        DbAppUser user = identityService.requireUserById(request.userId());

        Authentication authentication = new UsernamePasswordAuthenticationToken(
            user.id().toString(),
            null,
            List.of(new SimpleGrantedAuthority("ROLE_DEV"))
        );

        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        HttpSession session = httpServletRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);

        return new DevSessionResponse(
            true,
            user.id(),
            user.organizationId(),
            user.displayName(),
            user.status(),
            Instant.ofEpochMilli(session.getCreationTime()).toString()
        );
    }

    @GetMapping("/api/v1/me/context")
    public MeContextResponse getMeContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "No authenticated session.");
        }

        UUID userId;
        try {
            userId = UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid authenticated principal.");
        }

        return identityService.buildUserContext(userId);
    }
}
