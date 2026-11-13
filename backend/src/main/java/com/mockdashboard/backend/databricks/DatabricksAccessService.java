package com.mockdashboard.backend.databricks;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@Profile("!postgres")
public class DatabricksAccessService {

    private final DatabricksAccessRepository repository;

    public DatabricksAccessService(DatabricksAccessRepository repository) {
        this.repository = repository;
    }

    public List<CustomerAccessRecord> getCustomerAccessByUserId(String userId) {
        return repository.findCustomerAccessByUserId(userId);
    }

    public List<CustomerAccessRecord> replaceCustomerAccess(String userId, UpdateCustomerAccessRequest request) {
        Set<String> dedupedCustomerIds = new LinkedHashSet<>();
        for (String customerId : request.customerIds()) {
            if (customerId != null && !customerId.isBlank()) {
                dedupedCustomerIds.add(customerId.trim());
            }
        }

        String grantedBy = request.grantedBy();
        if (grantedBy == null || grantedBy.isBlank()) {
            grantedBy = userId;
        }

        return repository.replaceCustomerAccess(userId, List.copyOf(dedupedCustomerIds), grantedBy);
    }

    public List<LocalVinAccessRecord> getLocalVinAccess(String vin, String customerId, Integer limit) {
        int normalizedLimit = limit == null ? 100 : Math.min(Math.max(limit, 1), 1000);
        return repository.findLocalVinAccess(vin, customerId, normalizedLimit);
    }

    public UploadLocalVinAccessResponse uploadLocalVinAccess(UploadLocalVinAccessRequest request) {
        int insertedCount = repository.insertLocalVinAccess(request.records());
        return new UploadLocalVinAccessResponse(insertedCount);
    }
}
