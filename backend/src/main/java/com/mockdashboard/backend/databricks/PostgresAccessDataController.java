package com.mockdashboard.backend.databricks;

import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Profile("postgres")
@RequestMapping("/api/v1/local-vin-access")
public class PostgresAccessDataController {

    private final PostgresAccessDataRepository repository;

    public PostgresAccessDataController(PostgresAccessDataRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<LocalVinAccessRecord> getLocalVinAccess(
        @RequestParam(required = false) String vin,
        @RequestParam(required = false) String customerId,
        @RequestParam(required = false) Integer limit
    ) {
        int normalizedLimit = limit == null ? 100 : Math.min(Math.max(limit, 1), 1000);
        return repository.findLocalVinAccess(vin, customerId, normalizedLimit);
    }

    @PostMapping
    public UploadLocalVinAccessResponse uploadLocalVinAccess(
        @Valid @RequestBody UploadLocalVinAccessRequest request
    ) {
        return new UploadLocalVinAccessResponse(repository.insertLocalVinAccess(request.records()));
    }
}
