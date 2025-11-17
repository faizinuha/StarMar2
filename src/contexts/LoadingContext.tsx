import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isAppLoading: boolean;
  setAppLoading: (loading: boolean) => void;
  isAuthLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  isAnyLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setAppLoading = (loading: boolean) => {
    setIsAppLoading(loading);
  };

  const setAuthLoading = (loading: boolean) => {
    setIsAuthLoading(loading);
  };

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  };

  // Check if any loading state is active
  const isAnyLoading = isAppLoading || isAuthLoading || Object.values(loadingStates).some(Boolean);

  const value = {
    isAppLoading,
    setAppLoading,
    isAuthLoading,
    setAuthLoading,
    loadingStates,
    setLoading,
    isAnyLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

// Hook for component-specific loading states
export function useComponentLoading(componentKey: string) {
  const { loadingStates, setLoading } = useLoading();
  
  const isLoading = loadingStates[componentKey] || false;
  
  const setComponentLoading = (loading: boolean) => {
    setLoading(componentKey, loading);
  };

  return { isLoading, setComponentLoading };
}