package com.mockdashboard.backend.databricks;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record UploadLocalVinAccessRequest(
    @NotEmpty List<@Valid LocalVinAccessRecord> records
) {
}
