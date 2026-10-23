import { useEffect, useState } from 'react';
import { useUser, type User } from '../context/UserContext.tsx';

export function UserSelector() {
  const { currentUser, setCurrentUser, users: sessionUsers } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    setIsLoadingUsers(true);
    setUsers(sessionUsers);
    setIsLoadingUsers(false);
  }, [sessionUsers]);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 14px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          background: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 160,
        }}
      >
        <span>{currentUser ? currentUser.name : 'Select user'}</span>
        <span style={{ marginLeft: 'auto' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            minWidth: 220,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {isLoadingUsers ? (
            <div style={{ padding: '12px 14px', color: '#6b7280', fontSize: 14 }}>Loading...</div>
          ) : users.length > 0 ? (
            users.map((user) => (
              <button
                key={user.user_id}
                onClick={() => handleSelectUser(user)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  background: currentUser?.user_id === user.user_id ? '#f3f4f6' : '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  borderBottom: '1px solid #f0f0f0',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = currentUser?.user_id === user.user_id ? '#f3f4f6' : '#fff';
                }}
              >
                <div style={{ fontWeight: 500 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{user.email}</div>
              </button>
            ))
          ) : (
            <div style={{ padding: '12px 14px', color: '#6b7280', fontSize: 14 }}>No users found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserSelector;
