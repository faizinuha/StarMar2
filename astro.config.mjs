import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap'; // Import integrasi

export default defineConfig({
  // PASTI BUKA URL INI VALID 100%
  // Gunakan HTTPS dan pastikan tidak ada garis miring di akhir.
  site: 'https://starmar2.vercel.app', 
  
  integrations: [
    sitemap(), // Aktifkan integrasi sitemap
  ],
  
  // Jika Anda menggunakan Vercel, pastikan adapter sudah benar
  output: 'server',
  adapter: vercel(), 
});
