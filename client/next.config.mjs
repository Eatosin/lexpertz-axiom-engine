/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Exclude the heavy PDF engine from the Vercel serverless bundle
  serverExternalPackages:['@react-pdf/renderer'],
  
  experimental: {
    // SOTA FIX: Forces Vercel to strictly tree-shake these heavy libraries
    optimizePackageImports:['lucide-react', 'recharts', 'framer-motion'],
    serverActions: {
      allowedOrigins:['localhost:3000', '*.vercel.app']
    }
  }
};

export default nextConfig;
