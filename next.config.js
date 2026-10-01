/** @type {import('next').NextConfig} */
module.exports = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/k/:slug', destination: '/getkey/:slug', permanent: false }, // ลิงก์เก่า
      { source: '/dashboard', destination: '/create', permanent: false }, // ลิงก์เก่าของ Flexozy
      { source: '/slip-check', destination: '/', permanent: false },
      { source: '/slip-create', destination: '/', permanent: false },
    ];
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    }];
  },
};
