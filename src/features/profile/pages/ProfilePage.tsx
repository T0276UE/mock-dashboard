import { useState } from 'react';
import { customers } from '../../../data/customers';
import { useUser } from '../../../context/UserContext';
import './ProfilePage.css';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function humanize(value: string): string {
  return value
    .replace(/[:_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function Field({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="profile-field">
      <div className="profile-field-label">{label}</div>
      <div className={`profile-field-value${muted ? ' profile-muted' : ''}`}>{value}</div>
    </div>
  );
}

type ProfileView = 'user' | 'developer';

export default function ProfilePage() {
  const [profileView, setProfileView] = useState<ProfileView>('user');
  const {
    currentUser,
    users,
    session,
    effectiveRoles,
    effectivePermissions,
    databricksSource,
  } = useUser();

  if (!currentUser) {
    return (
      <section className="profile-card">
        <div className="profile-empty">Select a user context to view profile information.</div>
      </section>
    );
  }

  const manager = users.find((user) => user.user_id === currentUser.manager_user_id) ?? null;
  const directReports = users.filter((user) => user.manager_user_id === currentUser.user_id);
  const managedCustomers = currentUser.managed_customer_ids
    .map((customerId) => customers.find((customer) => customer.customerId === customerId))
    .filter((customer) => customer !== undefined);
  const vehiclePermission = effectivePermissions.find((permission) => permission.startsWith('vehicles:')) ?? 'Not assigned';
  const customerPermission = effectivePermissions.find((permission) => permission.startsWith('customers:')) ?? 'Not assigned';
  const isDeveloperView = profileView === 'developer';
  const hasVehicleAccess = vehiclePermission !== 'Not assigned';

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <div>
          <p className="profile-breadcrumb">Marketplace · Account</p>
          <h1 className="profile-heading">My profile</h1>
          <p className="profile-subheading">
            {isDeveloperView
              ? 'Review identity, effective access, and session diagnostics.'
              : 'Review your account, marketplace access, and organization information.'}
          </p>
        </div>
        <div className="profile-view-switcher" role="group" aria-label="Profile detail level">
          <button
            type="button"
            className={`profile-view-option${!isDeveloperView ? ' active' : ''}`}
            aria-pressed={!isDeveloperView}
            onClick={() => setProfileView('user')}
          >
            User view
          </button>
          <button
            type="button"
            className={`profile-view-option${isDeveloperView ? ' active' : ''}`}
            aria-pressed={isDeveloperView}
            onClick={() => setProfileView('developer')}
          >
            Developer view
          </button>
        </div>
      </header>

      {isDeveloperView && (
        <div className="profile-developer-notice" role="status">
          Developer view displays internal identifiers, raw permission data, and session diagnostics.
        </div>
      )}

      <section className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">{initials(currentUser.name)}</div>
          <div style={{ minWidth: 0 }}>
            <h2 className="profile-name">{currentUser.name}</h2>
            <p className="profile-email">{currentUser.email}</p>
            <div className="profile-badges">
              <span className={`profile-badge ${currentUser.status === 'active' ? 'active' : ''}`}><span className="profile-badge-dot" />{currentUser.status}</span>
              <span className="profile-badge">{humanize(currentUser.role)}</span>
              {isDeveloperView && <span className="profile-badge">{session?.provider === 'external' ? 'Backend session' : 'Demo session'}</span>}
            </div>
          </div>
        </div>
        <div className="profile-hero-metric">
          <div className="profile-hero-metric-label">Managed customers</div>
          <div className="profile-hero-metric-value">{managedCustomers.length}</div>
        </div>
      </section>

      <div className="profile-layout">
        <div className="profile-column">
          <section className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">General information</h2>
              <p className="profile-card-description">
                {isDeveloperView ? 'Identity fields currently supplied by the active user session.' : 'Your general marketplace account information.'}
              </p>
            </div>
            <div className="profile-card-body">
              <Field label="Full name" value={currentUser.name} />
              <Field label="Email address" value={currentUser.email} />
              {isDeveloperView && <Field label="Internal user ID" value={currentUser.user_id} />}
              <Field label="Job title" value="Not configured" muted />
              <Field label="Phone number" value="Not configured" muted />
              <Field label="Preferred timezone" value="America/Detroit" />
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Marketplace access</h2>
              <p className="profile-card-description">Effective capabilities and account scope used across customers, vehicles, and products.</p>
            </div>
            <div className="profile-stat-grid">
              {isDeveloperView && <div className="profile-stat"><div className="profile-stat-label">Effective roles</div><div className="profile-stat-value">{effectiveRoles.length}</div></div>}
              {isDeveloperView && <div className="profile-stat"><div className="profile-stat-label">Permissions</div><div className="profile-stat-value">{effectivePermissions.length}</div></div>}
              <div className="profile-stat"><div className="profile-stat-label">Customers</div><div className="profile-stat-value">{managedCustomers.length}</div></div>
              {!isDeveloperView && <div className="profile-stat"><div className="profile-stat-label">Direct reports</div><div className="profile-stat-value">{directReports.length}</div></div>}
            </div>
            <div className="profile-card-body">
              <Field
                label="Customer access"
                value={isDeveloperView ? humanize(customerPermission) : `${managedCustomers.length} assigned customer${managedCustomers.length === 1 ? '' : 's'}`}
              />
              <Field label="Vehicle inventory" value={isDeveloperView ? humanize(vehiclePermission) : (hasVehicleAccess ? 'Available' : 'Not assigned')} />
              <Field label={isDeveloperView ? 'Role hierarchy' : 'Account role'} value={isDeveloperView ? effectiveRoles.map(humanize).join(' · ') : humanize(currentUser.role)} />
            </div>
            {isDeveloperView && (
              <div className="profile-chip-list">
                {effectivePermissions.map((permission) => <span className="profile-chip" key={permission}>{permission}</span>)}
              </div>
            )}
          </section>

          <section className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Customer portfolio</h2>
              <p className="profile-card-description">Marketplace customers available to the current profile.</p>
            </div>
            {managedCustomers.length > 0 ? (
              <div className="profile-customer-list">
                {managedCustomers.map((customer) => (
                  <div className="profile-customer-row" key={customer.customerId}>
                    <div>
                      <div className="profile-customer-name">{customer.name}</div>
                      <div className="profile-customer-meta">{customer.region ?? 'Region not configured'} · {customer.status}</div>
                    </div>
                    {isDeveloperView && <div className="profile-customer-id">{customer.customerId}</div>}
                  </div>
                ))}
              </div>
            ) : <div className="profile-empty">No managed customers are assigned.</div>}
          </section>
        </div>

        <div className="profile-column">
          <section className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Organization</h2>
              <p className="profile-card-description">Reporting relationships derived from the current management tree.</p>
            </div>
            <div className="profile-card-body">
              <Field label="Manager" value={manager?.name ?? 'Top-level account'} />
              <Field label="Direct reports" value={directReports.length ? directReports.map((user) => user.name).join(', ') : 'None'} />
              <Field label="Account role" value={humanize(currentUser.role)} />
            </div>
          </section>

          {isDeveloperView && (
            <section className="profile-card">
              <div className="profile-card-header">
                <h2 className="profile-card-title">Session diagnostics</h2>
                <p className="profile-card-description">Backend authentication and access-source details for development troubleshooting.</p>
              </div>
              <div className="profile-card-body">
                <Field label="Authentication" value={session?.provider === 'external' ? 'Spring backend session' : 'Local demo session'} />
                <Field label="Session status" value={session?.isAuthenticated ? 'Authenticated' : 'Not authenticated'} />
                <Field label="Session issued" value={formatTimestamp(session?.issuedAt)} />
                <Field label="Access source" value={humanize(databricksSource)} />
              </div>
            </section>
          )}

          <section className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Preferences</h2>
              <p className="profile-card-description">Reserved for editable settings when profile persistence is connected.</p>
            </div>
            <div className="profile-card-body">
              <Field label="Default landing page" value="Marketplace dashboard" />
              <Field label="Email notifications" value="Not configured" muted />
              <Field label="Upload notifications" value="Not configured" muted />
              <Field label="Language" value="English" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
