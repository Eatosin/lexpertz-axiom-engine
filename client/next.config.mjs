/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // This stops the "Internal Error" during the deployment output phase.
  serverExternalPackages: ['@react-pdf/renderer'],
  
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app']
    }
  }
};

export default nextConfig;
