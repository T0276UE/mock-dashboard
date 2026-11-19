package com.mockdashboard.backend.databricks;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatabricksAccessServiceTest {

    @Mock
    private DatabricksAccessRepository repository;

    private DatabricksAccessService service;

    @BeforeEach
    void setUp() {
        service = new DatabricksAccessService(repository);
    }

    @Test
    void replaceCustomerAccess_deduplicatesCustomerIdsAndDefaultsGrantedBy() {
        UpdateCustomerAccessRequest request = new UpdateCustomerAccessRequest(
            List.of("CUST-000124", "CUST-000124", "CUST-000208", "  "),
            ""
        );

        when(repository.replaceCustomerAccess(eq("USR-001"), org.mockito.ArgumentMatchers.anyList(), eq("USR-001")))
            .thenReturn(List.of(new CustomerAccessRecord("USR-001", "CUST-000124", "USR-001")));

        service.replaceCustomerAccess("USR-001", request);

        ArgumentCaptor<List<String>> idsCaptor = ArgumentCaptor.forClass(List.class);
        verify(repository).replaceCustomerAccess(eq("USR-001"), idsCaptor.capture(), eq("USR-001"));
        assertThat(idsCaptor.getValue()).containsExactly("CUST-000124", "CUST-000208");
    }

    @Test
    void getLocalVinAccess_normalizesLimitFloorAndCeiling() {
        when(repository.findLocalVinAccess(eq(null), eq(null), anyInt())).thenReturn(List.of());

        service.getLocalVinAccess(null, null, -50);
        verify(repository).findLocalVinAccess(null, null, 1);

        service.getLocalVinAccess(null, null, 5_000);
        verify(repository).findLocalVinAccess(null, null, 1000);

        service.getLocalVinAccess(null, null, null);
        verify(repository).findLocalVinAccess(null, null, 100);
    }

    @Test
    void uploadLocalVinAccess_returnsInsertedCountFromRepository() {
        UploadLocalVinAccessRequest request = new UploadLocalVinAccessRequest(List.of(
            new LocalVinAccessRecord(
                "LV-NEW-0001",
                "CUST-000124",
                null,
                true,
                "1HGCM82633A764219",
                "7JXK194",
                "Jeep",
                "Grand Cherokee",
                "2024",
                "2026-11-09T16:00:00.000Z",
                "USR-001"
            )
        ));

        when(repository.insertLocalVinAccess(request.records())).thenReturn(1);

        UploadLocalVinAccessResponse response = service.uploadLocalVinAccess(request);

        assertThat(response.insertedCount()).isEqualTo(1);
        verify(repository).insertLocalVinAccess(request.records());
    }
}