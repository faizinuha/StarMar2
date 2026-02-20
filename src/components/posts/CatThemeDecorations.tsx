/**
 * Cat-themed UI decorations and effects for NekoPaw social media
 */

interface CatThemeDecorationsProps {
  type?: "paw-prints" | "sparkles" | "hearts-paws" | "floating-leaves" | "corner-paws";
  intensity?: "light" | "medium" | "heavy";
  opacity?: number;
  className?: string;
}

export const CatThemeDecorations = ({
  type = "sparkles",
  intensity = "light",
  opacity = 0.08,
  className = "",
}: CatThemeDecorationsProps) => {
  const getOpacity = () => {
    switch (intensity) {
      case "light":
        return opacity * 0.5;
      case "medium":
        return opacity;
      case "heavy":
        return opacity * 1.5;
      default:
        return opacity;
    }
  };

  const decorationContent = () => {
    switch (type) {
      case "paw-prints":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute text-4xl select-none"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: getOpacity(),
                  animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              >
                🐾
              </div>
            ))}
          </div>
        );

      case "sparkles":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute text-xl select-none"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: getOpacity(),
                  animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              >
                ✨
              </div>
            ))}
          </div>
        );

      case "hearts-paws":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute text-2xl select-none"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: getOpacity(),
                  animation: `float ${4 + Math.random() * 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              >
                {Math.random() > 0.5 ? "❤️" : "🐾"}
              </div>
            ))}
          </div>
        );

      case "floating-leaves":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute text-3xl select-none"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: getOpacity(),
                  animation: `slide-in ${5 + Math.random() * 3}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              >
                🍃
              </div>
            ))}
          </div>
        );

      case "corner-paws":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Top-left */}
            <div className="absolute top-2 left-2 text-3xl opacity-10 select-none">
              🐾
            </div>
            {/* Top-right */}
            <div
              className="absolute top-2 right-2 text-3xl opacity-10 select-none"
              style={{ transform: "scaleX(-1)" }}
            >
              🐾
            </div>
            {/* Bottom-left */}
            <div
              className="absolute bottom-2 left-2 text-3xl opacity-10 select-none"
              style={{ transform: "scaleY(-1)" }}
            >
              🐾
            </div>
            {/* Bottom-right */}
            <div
              className="absolute bottom-2 right-2 text-3xl opacity-10 select-none"
              style={{ transform: "scale(-1)" }}
            >
              🐾
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {decorationContent()}
    </div>
  );
};

/**
 * Cat avatar with animated paw border
 */
interface CatAvatarProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showPaw?: boolean;
  className?: string;
}

export const CatAvatar = ({
  src,
  alt = "User avatar",
  size = "md",
  showPaw = true,
  className = "",
}: CatAvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} ${showPaw ? "ring-2 ring-primary/30" : ""} rounded-full overflow-hidden ${className}`}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <span className="text-xl">😸</span>
        </div>
      )}

      {showPaw && (
        <div className="absolute inset-0 rounded-full border-2 border-primary/40 pointer-events-none" />
      )}
    </div>
  );
};

/**
 * Cute notification badge with optional paw mark
 */
interface CatNotificationBadgeProps {
  count?: number;
  showPaw?: boolean;
  className?: string;
}

export const CatNotificationBadge = ({
  count = 0,
  showPaw = true,
  className = "",
}: CatNotificationBadgeProps) => {
  if (count === 0 && !showPaw) return null;

  return (
    <div
      className={`relative inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-primary-foreground bg-primary rounded-full ${className}`}
    >
      {count > 0 && <span>{count > 99 ? "99+" : count}</span>}
      {showPaw && count > 0 && <span className="ml-1 text-xs">🐾</span>}
      {showPaw && count === 0 && <span className="text-sm">🐾</span>}
    </div>
  );
};

/**
 * Shimmer loading effect with cat theme
 */
interface CatShimmerProps {
  width?: string;
  height?: string;
  className?: string;
  variant?: "text" | "card" | "avatar" | "custom";
}

export const CatShimmer = ({
  width = "w-full",
  height = "h-10",
  className = "",
  variant = "text",
}: CatShimmerProps) => {
  const variantClasses = {
    text: "rounded",
    card: "rounded-lg",
    avatar: "rounded-full",
    custom: "",
  };

  return (
    <div
      className={`${width} ${height} ${variantClasses[variant]} bg-muted animate-pulse relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </div>
  );
};

/**
 * Cute heart animation that follows mouse (optional)
 */
interface CuteHeartProps {
  x?: number;
  y?: number;
  delay?: number;
  size?: number;
}

export const CuteHeart = ({ x = 0, y = 0, delay = 0, size = 24 }: CuteHeartProps) => {
  return (
    <div
      className="fixed pointer-events-none select-none animate-fade-in"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        animation: `float 1s ease-out forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      <span style={{ fontSize: `${size}px` }}>💕</span>
    </div>
  );
};
