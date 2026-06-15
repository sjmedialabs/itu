/** @type {import('next').NextConfig} */
const nextConfig = {
  // Razorpay uses axios + native Node HTTPS; bundling it breaks outbound API calls in dev/prod.
  serverExternalPackages: ['razorpay'],
  allowedDevOrigins: ['194.164.150.223'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
