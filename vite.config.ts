import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Cho phép truy cập từ mọi IP
    port: 3300,        // Port frontend
    strictPort: true,  // Báo lỗi nếu port đã được sử dụng
    allowedHosts: [
      '.trycloudflare.com',  // Cho phép tất cả subdomain của Cloudflare Tunnel
      '.ngrok.io',           // Cho phép Ngrok (nếu dùng)
      '.ngrok-free.app',     // Ngrok domain mới
    ],
  }
})
