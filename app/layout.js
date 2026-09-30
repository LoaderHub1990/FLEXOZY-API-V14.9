import './globals.css';
import Nav from '@/components/Nav';
import Fx from '@/components/Fx';
export const metadata = {
  title: 'Flexozy — Slip API',
  description: 'API เช็คสลิปและสร้างลิงก์ชำระเงินพร้อมเพย์',
  metadataBase: new URL(process.env.SITE_URL || 'https://flexozy.site'),
};
export const viewport = { themeColor: '#000000' };
export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Fx />
        <Nav />
        {children}
        <footer className="foot">© {new Date().getFullYear()} Flexozy</footer>
      </body>
    </html>
  );
}
