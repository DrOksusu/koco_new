/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable standalone output for Docker
  output: 'standalone',

  // Set basePath for production deployment at /new
  basePath: process.env.NODE_ENV === 'production' ? '/new' : '',

  // Set assetPrefix for production
  assetPrefix: process.env.NODE_ENV === 'production' ? '/new' : '',

  // Disable ESLint and TypeScript checks during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    domains: [
      'koco-dental-files.s3.ap-northeast-2.amazonaws.com', // S3 버킷 도메인
      'lh3.googleusercontent.com', // Google 프로필 이미지
    ],
  },
}

module.exports = nextConfig