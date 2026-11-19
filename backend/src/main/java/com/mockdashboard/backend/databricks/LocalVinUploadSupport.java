package com.mockdashboard.backend.databricks;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

final class LocalVinUploadSupport {

    private LocalVinUploadSupport() {
    }

    static UploadLocalVinAccessRequest forAuthenticatedUser(
        UploadLocalVinAccessRequest request,
        Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated upload session.");
        }

        String uploaderUserId = authentication.getName();
        List<LocalVinAccessRecord> records = request.records().stream()
            .map(record -> normalize(record, uploaderUserId))
            .toList();
        return new UploadLocalVinAccessRequest(records);
    }

    private static LocalVinAccessRecord normalize(LocalVinAccessRecord record, String uploaderUserId) {
        String customerId = record.customerId().trim().toUpperCase(Locale.ROOT);
        if (!CustomerCatalog.containsCustomerId(customerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown customerId: " + customerId);
        }

        return new LocalVinAccessRecord(
            record.vehicleId().trim(),
            customerId,
            record.pendingCustomerId(),
            record.testvehicle(),
            record.vin().trim().toUpperCase(Locale.ROOT),
            trimToNull(record.name()),
            trimToNull(record.make()),
            trimToNull(record.model()),
            trimToNull(record.year()),
            trimToNull(record.timestamp()),
            uploaderUserId
        );
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
