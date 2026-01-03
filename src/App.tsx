import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminRoute from "./components/AdminRoute";
import { BannedUserRedirect } from "./components/BannedUserRedirect";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalPlayer } from "./components/layout/GlobalPlayer";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { MusicProvider } from "./contexts/Music";
import Admin from "./pages/Admin";
import { Auth } from "./pages/Auth";
import { AuthCallback } from "./pages/AuthCallback";
import Chat from "./pages/Chat";
import Checkpoint from "./pages/Checkpoint";
import Explore from "./pages/Explore";
import ForgotPassword from "./pages/ForgotPassword";
import Index from "./pages/Index";
import { Memes } from "./pages/Memes";
import NotFound from "./pages/NotFound";
import { Notifications } from "./pages/Notifications";
import Onboarding from "./pages/Onboarding";
import PlayPage from "./pages/play";
import Profile from "./pages/Profile";
import Reelms from "./pages/Reelms";
import { Settings } from "./pages/Settings";

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
  <BrowserRouter>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthProvider>
              <MusicProvider>
                <BannedUserRedirect />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/profile" element={<Profile />} />{" "}
                  <Route path="/reelms" element={<Reelms />} />
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
                        <Chat />
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
                  <Route path="/checkpoint" element={<Checkpoint />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <GlobalPlayer />
              </MusicProvider>
            </AuthProvider>
          </TooltipProvider>
        </LoadingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </BrowserRouter>
);

export default App;
