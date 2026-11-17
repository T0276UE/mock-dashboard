package com.mockdashboard.backend.databricks;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LocalVinAccessRecord(
    @NotBlank String vehicleId,
    @NotBlank @Pattern(regexp = "(?i)^CUST-\\d+$") String customerId,
    Object pendingCustomerId,
    Boolean testvehicle,
    @NotBlank @Pattern(regexp = "^[A-HJ-NPR-Z0-9]{11,17}$") String vin,
    String name,
    String make,
    String model,
    @Pattern(regexp = "^\\d{4}$") String year,
    String timestamp,
    String uploaderUserId
) {
}
