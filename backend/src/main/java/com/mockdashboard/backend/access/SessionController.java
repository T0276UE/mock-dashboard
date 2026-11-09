package com.mockdashboard.backend.access;

import com.mockdashboard.backend.security.MockUserContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/session")
public class SessionController {

    private final AccessService accessService;

    public SessionController(AccessService accessService) {
        this.accessService = accessService;
    }

    @GetMapping("/me")
    public SessionMeResponse getSessionMe(HttpServletRequest request) {
        MockUserContext userContext = (MockUserContext) request.getAttribute(MockUserContext.REQUEST_ATTRIBUTE);
        return accessService.getSessionMe(userContext.userId());
    }
}
