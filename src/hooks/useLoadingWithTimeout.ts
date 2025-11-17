import { useEffect, useState } from 'react';

interface UseLoadingWithTimeoutOptions {
  timeout?: number; // in milliseconds, default 10 seconds
  fallbackToError?: boolean; // whether to treat timeout as error
}

export function useLoadingWithTimeout(
  isLoading: boolean,
  options: UseLoadingWithTimeoutOptions = {}
) {
  const { timeout = 10000, fallbackToError = false } = options;
  const [isTimeout, setIsTimeout] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading && !isTimeout) {
      // Start timeout when loading begins
      const id = setTimeout(() => {
        console.warn(`Loading timeout reached after ${timeout}ms`);
        setIsTimeout(true);
      }, timeout);
      
      setTimeoutId(id);
      
      return () => {
        if (id) {
          clearTimeout(id);
        }
      };
    } else if (!isLoading && timeoutId) {
      // Clear timeout when loading completes
      clearTimeout(timeoutId);
      setTimeoutId(null);
      setIsTimeout(false);
    }
  }, [isLoading, timeout, isTimeout, timeoutId]);

  // Reset timeout state when isLoading becomes false
  useEffect(() => {
    if (!isLoading) {
      setIsTimeout(false);
    }
  }, [isLoading]);

  return {
    isLoading: isLoading && !isTimeout,
    isTimeout,
    hasTimedOut: isTimeout,
    shouldShowError: fallbackToError && isTimeout,
    shouldShowLoading: isLoading && !isTimeout,
  };
}

// Hook specifically for React Query with better error handling
export function useQueryLoadingState(queryResult: { 
  isLoading?: boolean; 
  isFetching?: boolean; 
  error?: unknown; 
  isError?: boolean;
}) {
  const { isLoading = false, isFetching = false, error, isError = false } = queryResult;
  
  const loadingState = useLoadingWithTimeout(isLoading || isFetching, {
    timeout: 15000, // Longer timeout for queries
    fallbackToError: true
  });

  return {
    ...loadingState,
    hasError: isError || loadingState.shouldShowError,
    error: error || (loadingState.shouldShowError ? new Error('Request timeout') : null),
    isInitialLoading: isLoading && !isFetching,
    isRefetching: !isLoading && isFetching,
  };
}