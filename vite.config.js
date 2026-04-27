import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'firebase/app': path.resolve(__dirname, './src/mock-firebase/app.js'),
      'firebase/auth': path.resolve(__dirname, './src/mock-firebase/auth.js'),
      'firebase/firestore': path.resolve(__dirname, './src/mock-firebase/firestore.js')
    }
  }
})
