package com.mockdashboard.backend.databricks;

public record LocalVinAccessRecord(
    String vehicleId,
    String customerId,
    Object pendingCustomerId,
    Boolean testvehicle,
    String vin,
    String name,
    String make,
    String model,
    String year,
    String timestamp,
    String uploaderUserId
) {
}
