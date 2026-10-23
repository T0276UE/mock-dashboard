import React from 'react';
import { routes } from '../navigation/routes';
import { hasAccess } from '../navigation/permissions';
import type { Role } from '../navigation/types';
import landingPageIcon from '../assets/landingPageIcon.svg';
import customersIcon from '../assets/customersIcon.svg';
import productsIcon from '../assets/productsIcon.svg';
import vehiclesIcon from '../assets/vehiclesIcon.svg';
import compatabilityIcon from '../assets/compatabilityIcon.svg';
import userManagementIcon from '../assets/userManagementIcon.svg';
import '../navigation/nav.css';

export interface NavBarProps {
  userRoles?: Role[];
  expanded: boolean;
  onHoverChange: (hovered: boolean) => void;
  onTogglePinned: () => void;
  pinned: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  userRoles = ['user'],
  expanded,
  onHoverChange,
  onTogglePinned,
  pinned,
}) => {
  const visible = routes.filter((r) => hasAccess(userRoles, r));
  const routeIcons: Record<string, string> = {
    landing: landingPageIcon,
    customers: customersIcon,
    products: productsIcon,
    vehicles: vehiclesIcon,
    compat: compatabilityIcon,
    manage: userManagementIcon,
  };

  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <aside
      className={`nav-rail ${expanded ? 'expanded' : ''}`}
      aria-label="Navigation"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div className="nav-rail-inner">
        <button
          type="button"
          className="nav-pin-toggle"
          onClick={onTogglePinned}
          aria-pressed={pinned}
          aria-label={pinned ? 'Collapse navigation panel' : 'Expand navigation panel'}
          title={pinned ? 'Collapse navigation' : 'Expand navigation'}
        >
          <span className="nav-pin-icon" aria-hidden>
            {pinned ? '«' : '»'}
          </span>
          <span className="nav-label">Navigation</span>
        </button>
        <div className="nav-spacer" />
        {visible.map((r) => (
          <a
            key={r.id}
            href={r.path}
            className="nav-item"
            title={r.name}
            aria-label={r.name}
            onClick={(event) => {
              event.preventDefault();
              handleNavigate(r.path);
            }}
          >
            <span className="nav-icon" aria-hidden>
              <img src={routeIcons[r.id]} alt="" style={{ width: 18, height: 18, display: 'block' }} />
            </span>
            <span className="nav-label">{r.name}</span>
          </a>
        ))}
      </div>
    </aside>
  );
};

export default NavBar;
