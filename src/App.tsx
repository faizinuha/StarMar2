import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import { AuthCallback } from "./pages/AuthCallback";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import { Memes } from "./pages/Memes";
import { Notifications } from "./pages/Notifications";
import { Settings } from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import Chat from "./pages/Chat"; // Assuming Chat is a default export
import ChatDetail from "./pages/ChatDetail";
import { GlobalPlayer } from "./components/layout/GlobalPlayer";
import { MusicProvider } from "./contexts/Music"; // Correctly import MusicProvider
import PlayPage from "./pages/play";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 429
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500 && status !== 429) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <MusicProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/profile" element={<Profile />} />{" "}
                  {/* This route is likely for the current user's profile */}
                  <Route path="/mymusic/music" element={<PlayPage />} />
                  <Route path="/play/:trackId" element={<PlayPage />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/memes" element={<Memes />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="/chat"
                    element={
                      <PrivateRoute>
                        <Chat />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/chat/:chatId"
                    element={
                      <PrivateRoute>
                        <ChatDetail />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/Admin_Dashbord"
                    element={
                      <AdminRoute>
                        <Admin />
                      </AdminRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <GlobalPlayer />
              </MusicProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LoadingProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
