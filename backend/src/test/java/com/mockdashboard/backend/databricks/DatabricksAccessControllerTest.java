package com.mockdashboard.backend.databricks;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DatabricksAccessController.class)
@AutoConfigureMockMvc(addFilters = false)
class DatabricksAccessControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DatabricksAccessService accessService;

    @Test
    void getCustomerAccessByUserId_returnsCustomerAccessRows() throws Exception {
        List<CustomerAccessRecord> response = List.of(
            new CustomerAccessRecord("USR-001", "CUST-000124", "USR-001"),
            new CustomerAccessRecord("USR-001", "CUST-000208", "USR-001")
        );

        when(accessService.getCustomerAccessByUserId(eq("USR-001"))).thenReturn(response);

        mockMvc.perform(get("/api/v1/customer-access/USR-001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].userId").value("USR-001"))
            .andExpect(jsonPath("$[0].customerId").value("CUST-000124"))
            .andExpect(jsonPath("$[1].customerId").value("CUST-000208"));
    }

    @Test
    void postCustomerAccess_replacesRowsAndReturnsPayload() throws Exception {
        List<CustomerAccessRecord> response = List.of(
            new CustomerAccessRecord("USR-002", "CUST-000509", "USR-001")
        );

        when(accessService.replaceCustomerAccess(eq("USR-002"), org.mockito.ArgumentMatchers.any(UpdateCustomerAccessRequest.class)))
            .thenReturn(response);

        String body = """
            {
              "customerIds": ["CUST-000509"],
              "grantedBy": "USR-001"
            }
            """;

        mockMvc.perform(post("/api/v1/customer-access/USR-002")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].userId").value("USR-002"))
            .andExpect(jsonPath("$[0].customerId").value("CUST-000509"));
    }

    @Test
    void postCustomerAccess_withEmptyCustomerIds_returnsBadRequest() throws Exception {
        String body = """
            {
              "customerIds": [],
              "grantedBy": "USR-001"
            }
            """;

        mockMvc.perform(post("/api/v1/customer-access/USR-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getLocalVinAccess_returnsRows() throws Exception {
        List<LocalVinAccessRecord> response = List.of(
            new LocalVinAccessRecord(
                "LV-0001",
                "CUST-000124",
                null,
                true,
                "1HGCM82633A764219",
                "7JXK194",
                "Jeep",
                "Grand Cherokee",
                "2024",
                "2026-11-05T09:00:00.000Z",
                "USR-001"
            )
        );

        when(accessService.getLocalVinAccess(eq("1HGCM82633A764219"), eq("CUST-000124"), eq(25))).thenReturn(response);

        mockMvc.perform(get("/api/v1/local-vin-access")
                .queryParam("vin", "1HGCM82633A764219")
                .queryParam("customerId", "CUST-000124")
                .queryParam("limit", "25"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].vehicleId").value("LV-0001"))
            .andExpect(jsonPath("$[0].customerId").value("CUST-000124"))
            .andExpect(jsonPath("$[0].vin").value("1HGCM82633A764219"));
    }

    @Test
    void postLocalVinAccess_insertsRecordsAndReturnsCount() throws Exception {
        when(accessService.uploadLocalVinAccess(org.mockito.ArgumentMatchers.any(UploadLocalVinAccessRequest.class)))
            .thenReturn(new UploadLocalVinAccessResponse(2));

        String body = """
            {
              "records": [
                {
                  "vehicleId": "LV-NEW-0001",
                  "customerId": "CUST-000124",
                  "pendingCustomerId": null,
                  "testvehicle": true,
                  "vin": "1HGCM82633A764219",
                  "name": "7JXK194",
                  "make": "Jeep",
                  "model": "Grand Cherokee",
                  "year": "2024",
                  "timestamp": "2026-11-09T16:00:00.000Z",
                  "uploaderUserId": "USR-001"
                },
                {
                  "vehicleId": "LV-NEW-0002",
                  "customerId": "CUST-000208",
                  "pendingCustomerId": null,
                  "testvehicle": false,
                  "vin": "1FTFW1E50NFA55217",
                  "name": "8RMD552",
                  "make": "Ram",
                  "model": "1500",
                  "year": "2022",
                  "timestamp": "2026-11-09T16:01:00.000Z",
                  "uploaderUserId": "USR-002"
                }
              ]
            }
            """;

        mockMvc.perform(post("/api/v1/local-vin-access")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.insertedCount").value(2));
    }

    @Test
    void postLocalVinAccess_withEmptyRecords_returnsBadRequest() throws Exception {
        String body = """
            {
              "records": []
            }
            """;

        mockMvc.perform(post("/api/v1/local-vin-access")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }
}