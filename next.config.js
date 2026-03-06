/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-s3-bucket.s3.amazonaws.com'],
  },
}

module.exports = nextConfig
