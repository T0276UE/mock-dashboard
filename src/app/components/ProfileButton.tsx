import { useUser } from '../../context/UserContext';
import { navigateTo } from '../../services/navigationService';

function initials(name: string | undefined): string {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

export default function ProfileButton() {
  const { currentUser } = useUser();

  return (
    <button
      type="button"
      onClick={() => navigateTo('/profile')}
      aria-label="Open user profile"
      title="Open user profile"
      style={{
        minHeight: 38,
        padding: '5px 10px 5px 6px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid #d1d9e3',
        borderRadius: 9,
        background: '#fff',
        color: '#172033',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 650,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          background: '#eaf4ff',
          border: '1px solid #cfe4f7',
          color: '#0563a7',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.3,
        }}
      >
        {initials(currentUser?.name)}
      </span>
      <span>Profile</span>
    </button>
  );
}
