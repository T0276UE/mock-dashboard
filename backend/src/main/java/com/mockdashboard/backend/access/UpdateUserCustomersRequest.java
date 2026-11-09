package com.mockdashboard.backend.access;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdateUserCustomersRequest(
    @NotNull List<String> customerIds
) {
}
