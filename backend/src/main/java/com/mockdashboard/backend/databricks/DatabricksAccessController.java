package com.mockdashboard.backend.databricks;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class DatabricksAccessController {

    private final DatabricksAccessService accessService;

    public DatabricksAccessController(DatabricksAccessService accessService) {
        this.accessService = accessService;
    }

    @GetMapping("/customer-access/{userId}")
    public List<CustomerAccessRecord> getCustomerAccessByUserId(@PathVariable String userId) {
        return accessService.getCustomerAccessByUserId(userId);
    }

    @PostMapping("/customer-access/{userId}")
    public List<CustomerAccessRecord> replaceCustomerAccess(
        @PathVariable String userId,
        @Valid @RequestBody UpdateCustomerAccessRequest request
    ) {
        return accessService.replaceCustomerAccess(userId, request);
    }

    @GetMapping("/local-vin-access")
    public List<LocalVinAccessRecord> getLocalVinAccess(
        @RequestParam(required = false) String vin,
        @RequestParam(required = false) String customerId,
        @RequestParam(required = false) Integer limit
    ) {
        return accessService.getLocalVinAccess(vin, customerId, limit);
    }

    @PostMapping("/local-vin-access")
    public UploadLocalVinAccessResponse uploadLocalVinAccess(
        @Valid @RequestBody UploadLocalVinAccessRequest request
    ) {
        return accessService.uploadLocalVinAccess(request);
    }
}