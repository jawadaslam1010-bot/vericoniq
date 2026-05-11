/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@contractly/db', '@contractly/types', '@contractly/ai'],

  // Keep these Node.js-only packages out of the webpack bundle so they can
  // access the filesystem at runtime (font files, native bindings, etc.)
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'mammoth', 'pdf-parse'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Redirect HTTP → HTTPS in production
  async redirects() {
    if (process.env.NODE_ENV !== 'production') return []
    return [
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
        destination: 'https://app.contractly.com.au/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
