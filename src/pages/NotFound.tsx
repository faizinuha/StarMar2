import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="text-8xl">🐱</div>
        <h1 className="text-5xl font-bold text-primary">404</h1>
        <p className="text-xl text-muted-foreground">Oops! This page ran away like a kitty~</p>
        <a href="/" className="inline-block px-6 py-3 gradient-button rounded-full text-primary-foreground">
          Go Home 🐾
        </a>
      </div>
    </div>
  );
};

export default NotFound;
