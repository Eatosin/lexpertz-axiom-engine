/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // SOTA: Forces the standalone build for Docker/HuggingFace container optimization
  output: 'standalone',
  
  // SOTA: Stable since Next.js 16 - Significantly reduces bundle size 
  // by only importing the specific icons/components used.
  optimizePackageImports: ['lucide-react', 'framer-motion'],
  
  // SOTA: Binary Firewall
  // Keeps native PDF rendering libs outside the JS bundle to prevent Vercel/Node runtime crashes.
  serverExternalPackages: ['@react-pdf/renderer'],
  
  // Turbopack is now the default engine. 
  // No experimental flags needed.
  experimental: {
    // Leave empty or remove if no other experimental features are active
  }
};

export default nextConfig;
