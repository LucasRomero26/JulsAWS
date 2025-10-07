import { useMemo } from 'react';

// --- MEJORADO: Hook para filtrar usuarios con búsqueda ---
export const useFilteredUsers = (users, searchTerm) => {
  return useMemo(() => {
    if (!searchTerm.trim()) {
      return users;
    }

    const term = searchTerm.toLowerCase().trim();
    return users.filter(user => {
      return (
        user.name.toLowerCase().includes(term) ||
        user.deviceId?.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term)
      );
    });
  }, [users, searchTerm]);
};
