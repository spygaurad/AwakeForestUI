// lib/contexts/AppContext.tsx

import { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  currentOrganizationId: string | null;
  currentProjectId: string | null;
  currentDatasetId: string | null;
  setCurrentOrganizationId: (id: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  setCurrentDatasetId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);

  return (
    <AppContext.Provider
      value={{
        currentOrganizationId,
        currentProjectId,
        currentDatasetId,
        setCurrentOrganizationId,
        setCurrentProjectId,
        setCurrentDatasetId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
