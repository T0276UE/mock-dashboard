package com.mockdashboard.backend.databricks;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** MVP customer identifiers mirrored from src/data/customers.ts. */
public final class CustomerCatalog {

    public static final Map<String, String> CUSTOMER_ID_BY_NORMALIZED_NAME = Map.ofEntries(
        Map.entry("motorq", "CUST-000124"),
        Map.entry("fleetco", "CUST-000208"),
        Map.entry("carvana", "CUST-000311"),
        Map.entry("leaseplan", "CUST-000415"),
        Map.entry("geotab", "CUST-000509"),
        Map.entry("drivenowautomotive", "CUST-000622"),
        Map.entry("supportco", "CUST-000714"),
        Map.entry("autofincorp", "CUST-000801")
    );

    public static final Set<String> CUSTOMER_IDS = Set.copyOf(CUSTOMER_ID_BY_NORMALIZED_NAME.values());

    private CustomerCatalog() {
    }

    public static boolean containsCustomerId(String customerId) {
        return customerId != null && CUSTOMER_IDS.contains(customerId.trim().toUpperCase(Locale.ROOT));
    }
}
