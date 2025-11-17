import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const client_id = '6eacc2472f984eaa8033bb187b012d78';
  const client_secret = env.SPOTIFY_CLIENT_SECRET;

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      // Custom plugin to proxy Spotify API calls during development
      mode === 'development' && {
        name: 'spotify-dev-api-proxy',
        configureServer(server: any) {
          server.middlewares.use('/api/spotify', async (req: any, res: any, next: any) => {
            console.log("Middleware for /api/spotify triggered.");
            console.log("Loaded SPOTIFY_CLIENT_SECRET:", client_secret ? "found" : "NOT FOUND");
            try {
              if (!client_secret) {
                throw new Error('SPOTIFY_CLIENT_SECRET not found in .env file.');
              }

              // 1. Get Access Token from Spotify
              const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
                },
                body: 'grant_type=client_credentials'
              });

              const tokenData = await tokenResponse.json() as any;
              if (!tokenResponse.ok) {
                console.error("Error fetching Spotify token:", tokenData);
                throw new Error('Failed to fetch access token from Spotify.');
              }
              const accessToken = tokenData.access_token;

              // 2. Get Recommendations from Spotify
              const recommendationsUrl = 'https://api.spotify.com/v1/recommendations?seed_artists=4NHQUGzhtTLFvgF5SZesLK&seed_genres=classical%2Ccountry&seed_tracks=0c6xIDDpzE81m2q797ordA';
              const recommendationsResponse = await fetch(recommendationsUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              
              const recommendationsData = await recommendationsResponse.json();
              if (!recommendationsResponse.ok) {
                console.error("Error fetching Spotify recommendations:", recommendationsData);
                throw new Error('Failed to fetch recommendations from Spotify.');
              }

              // 3. Send successful response back to the client
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(recommendationsData));

            } catch (error: any) {
              console.error('Spotify proxy middleware error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        }
      }
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
});
