import {
  useEffect,
  useState
} from 'react';

import { AuthContext } from './AuthContext';

export default function AuthProvider({
  children
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCurrentSession = async () => {
      try {
        const response = await fetch(
          '/api/sessions/current',
          {
            credentials: 'include'
          }
        );

        if (!response.ok) {
          setUser(null);
          return;
        }

        const currentUser =
          await response.json();

        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkCurrentSession();
  }, []);

  const login = userData => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}