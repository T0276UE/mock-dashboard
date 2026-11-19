package com.mockdashboard.backend.authorization;

import com.mockdashboard.backend.access.AccessUser;
import com.mockdashboard.backend.identity.IdentityService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class UserHierarchyServiceTest {

    private final IdentityServiceStub identityService = new IdentityServiceStub();
    private final UserHierarchyService service = new UserHierarchyService(identityService, null);

    @Test
    void resolvesDescendantsFromIdentityServiceTreeProjection() {
        setAccessUsers(List.of(
            user("root", null),
            user("manager", "root"),
            user("member", "manager"),
            user("peer", "root")
        ));

        assertThat(service.managesUser("root", "member")).isTrue();
        assertThat(service.managesUser("manager", "member")).isTrue();
        assertThat(service.managesUser("root", "peer")).isTrue();
        assertThat(service.managesUser("manager", "peer")).isFalse();
    }

    @Test
    void deniesMissingUsersSelfManagementAndCycles() {
        setAccessUsers(List.of(
            user("first", "second"),
            user("second", "first")
        ));

        assertThat(service.managesUser("first", "first")).isFalse();
        assertThat(service.managesUser("first", "missing")).isFalse();
        assertThat(service.managesUser("outside", "first")).isFalse();
        assertThat(service.managesUser("second", "first")).isFalse();
    }

    @Test
    void resolvesPostgresHierarchyDependencyWithoutLegacyRepository() {
        new ApplicationContextRunner()
            .withInitializer(context -> context.getEnvironment().setActiveProfiles("postgres"))
            .withUserConfiguration(PostgresHierarchyConfiguration.class)
            .run(context -> {
                assertThat(context).hasSingleBean(UserHierarchyService.class);
                assertThat(context.getBean(UserHierarchyService.class).managesUser("root", "member")).isTrue();
            });
    }

    private AccessUser user(String userId, String managerUserId) {
        return new AccessUser(userId, userId, null, managerUserId, "user", List.of(), "active");
    }

    private static class IdentityServiceStub extends IdentityService {
        private List<AccessUser> accessUsers = List.of();

        private IdentityServiceStub() {
            super(null, null);
        }

        @Override
        public List<AccessUser> listAccessUsers() {
            return accessUsers;
        }

        private void setAccessUsers(List<AccessUser> accessUsers) {
            this.accessUsers = accessUsers;
        }
    }

    @Configuration(proxyBeanMethods = false)
    @Import(UserHierarchyService.class)
    static class PostgresHierarchyConfiguration {
        @Bean
        IdentityService identityService() {
            IdentityServiceStub identityService = new IdentityServiceStub();
            identityService.setAccessUsers(List.of(user("root", null), user("member", "root")));
            return identityService;
        }

        private AccessUser user(String userId, String managerUserId) {
            return new AccessUser(userId, userId, null, managerUserId, "user", List.of(), "active");
        }
    }

    private void setAccessUsers(List<AccessUser> accessUsers) {
        identityService.setAccessUsers(accessUsers);
    }
}
