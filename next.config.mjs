/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  // ทุกอย่างของ Hub เรียกผ่าน /api/v1/shop/... เท่านั้น (auth/captcha ถูก rewrite ไปที่ตัวจริงภายใน ผู้ใช้เห็นแต่ /api/v1/shop)
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/happybirthday/warisara', destination: '/happybirthday/warisara.html' },
        { source: '/api/v1/shop/hub/auth/:path*', destination: '/api/auth/:path*' },
        { source: '/api/v1/shop/hub/captcha/:path*', destination: '/api/captcha/:path*' },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/uploads/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};
export default nextConfig;
