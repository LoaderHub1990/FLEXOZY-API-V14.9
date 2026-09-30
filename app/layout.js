import './globals.css';
import Link from 'next/link';
import { Noto_Sans_Thai, JetBrains_Mono } from 'next/font/google';
const sans = Noto_Sans_Thai({ subsets: ['thai', 'latin'], variable: '--sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--mono' });
export const metadata = {
  title: 'Flexozy — Luraph v15 Deobfuscator',
  description: 'เครื่องมือและ API สำหรับเกะสคริปต์ Luraph v15',
  metadataBase: new URL('https://flexozy.site'),
};
export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <header className="nav">
          <Link href="/" className="logo">FLEXOZY<span>.site</span></Link>
          <nav>
            <Link href="/" className="link">หน้าหลัก</Link>
            <Link href="/#api" className="link">API</Link>
            <Link href="/lura.ph/v15/deobfuscate" className="link">เครื่องมือเกะ</Link>
          </nav>
        </header>
        {children}
        <footer className="foot">© {new Date().getFullYear()} flexozy.site — Luraph v15 Deobfuscator</footer>
      </body>
    </html>
  );
}
