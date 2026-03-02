/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // SOTA: Keep this to shield Vercel from heavy native PDF binaries
  serverExternalPackages: ['@react-pdf/renderer'],
  
  experimental: {
    // Optimized for Next.js 15: Only optimize what is currently installed
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app']
    }
  }
};

export default nextConfig;
