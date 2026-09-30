import './globals.css';
import Nav from '@/components/Nav';
export const metadata = {
  title: 'Flexozy — Slip API',
  description: 'API เช็คสลิปและสร้างลิงก์ชำระเงินพร้อมเพย์',
  metadataBase: new URL(process.env.SITE_URL || 'https://flexozy.site'),
};
export const viewport = { themeColor: '#050b1a' };
export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,500;0,700;1,700&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Nav />
        {children}
        <footer className="foot">© {new Date().getFullYear()} Flexozy</footer>
      </body>
    </html>
  );
}
