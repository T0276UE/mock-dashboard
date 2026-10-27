import './App.css';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import NavBar from './app/components/NavBar';
import UserSelector from './app/components/UserSelector';
import { useUser } from './context/UserContext.tsx';
import { routes } from './navigation/routes';
import LandingPage from './features/landing/pages/LandingPage';
import CustomersPage from './features/customers/pages/CustomersPage';
import CustomerDetailPage from './features/customers/pages/CustomerDetailPage';
import ProductsPage from './features/products/pages/ProductsPage';
import VehiclesPage from './features/vehicles/pages/VehiclesPage';
import CompatibilityPage from './features/compatibility/pages/CompatibilityPage';
import ManagementPage from './features/management/pages/ManagementPage';
import type { Role } from './navigation/types';

const pageMap = {
  '/': LandingPage,
  '/customers': CustomersPage,
  '/products': ProductsPage,
  '/vehicles': VehiclesPage,
  '/compatibility': CompatibilityPage,
  '/management': ManagementPage,
};

function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [isNavPinned, setIsNavPinned] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const { effectiveRoles } = useUser();

  useEffect(() => {
    const handleRouteChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('app:route-change', handleRouteChange as EventListener);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('app:route-change', handleRouteChange as EventListener);
    };
  }, []);

  const getUserRoles = (): Role[] => effectiveRoles;

  const currentPath = path === '/' ? '/' : path.replace(/\/+$/, '') || '/';
  
  // Check for dynamic customer detail route
  const customerMatch = currentPath.match(/^\/customer\/(.+)$/);
  const customerId = customerMatch ? customerMatch[1] : null;
  
  let PageComponent = LandingPage;
  const isNavExpanded = isNavPinned || isNavHovered;

  const renderAppShell = (content: ReactNode) => (
    <div className="app-shell">
      <NavBar
        userRoles={getUserRoles()}
        expanded={isNavExpanded}
        pinned={isNavPinned}
        onHoverChange={setIsNavHovered}
        onTogglePinned={() => setIsNavPinned((prev) => !prev)}
      />
      <div className={`app-main ${isNavExpanded ? 'app-main-expanded' : ''}`}>
        <nav className="app-topbar">
          <div className="app-title">Mock Dashboard</div>
          <UserSelector />
        </nav>
        <main className="app-content">{content}</main>
      </div>
    </div>
  );
  
  if (customerId) {
    // Render customer detail page
    return renderAppShell(<CustomerDetailPage customerId={customerId} />);
  }
  
  const matchedRoute = routes.find((route) => route.path === currentPath);
  PageComponent = matchedRoute ? (pageMap[matchedRoute.path as keyof typeof pageMap] ?? LandingPage) : LandingPage;

  return renderAppShell(<PageComponent />);
}

export default App
