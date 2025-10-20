/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'koco-dental-files.s3.ap-northeast-2.amazonaws.com', // S3 버킷 도메인
      'lh3.googleusercontent.com', // Google 프로필 이미지
    ],
  },
}

module.exports = nextConfig