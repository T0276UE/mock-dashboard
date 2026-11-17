package com.mockdashboard.backend.databricks;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalVinUploadSupportTest {

    @Test
    void forAuthenticatedUser_normalizesRecordAndUsesAuthenticatedUploader() {
        UploadLocalVinAccessRequest request = new UploadLocalVinAccessRequest(List.of(
            new LocalVinAccessRecord(
                " LV-NEW-1 ",
                "cust-000124",
                null,
                false,
                "1hgcm82633a764219",
                " Plate 1 ",
                " Honda ",
                null,
                "2024",
                null,
                "untrusted-client-value"
            )
        ));

        UploadLocalVinAccessRequest normalized = LocalVinUploadSupport.forAuthenticatedUser(
            request,
            new UsernamePasswordAuthenticationToken("authenticated-user-id", null, List.of())
        );

        LocalVinAccessRecord record = normalized.records().getFirst();
        assertThat(record.vehicleId()).isEqualTo("LV-NEW-1");
        assertThat(record.customerId()).isEqualTo("CUST-000124");
        assertThat(record.vin()).isEqualTo("1HGCM82633A764219");
        assertThat(record.name()).isEqualTo("Plate 1");
        assertThat(record.uploaderUserId()).isEqualTo("authenticated-user-id");
    }

    @Test
    void forAuthenticatedUser_rejectsCustomerOutsideMvpCatalog() {
        UploadLocalVinAccessRequest request = new UploadLocalVinAccessRequest(List.of(
            new LocalVinAccessRecord(
                "LV-NEW-1",
                "CUST-999999",
                null,
                false,
                "1HGCM82633A764219",
                null,
                null,
                null,
                "2024",
                null,
                null
            )
        ));

        assertThatThrownBy(() -> LocalVinUploadSupport.forAuthenticatedUser(
            request,
            new UsernamePasswordAuthenticationToken("authenticated-user-id", null, List.of())
        ))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Unknown customerId");
    }
}
