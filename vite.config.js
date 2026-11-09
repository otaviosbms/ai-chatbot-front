import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Hosts liberados no `vite preview` (acesso via tunnel Cloudflare).
  preview: {
    allowedHosts: ['aichatbot.otaviosbms.com.br'],
  },
})
