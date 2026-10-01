import '../globals.css';
import '../ui.css';
import AppProvider from '@/components/AppProvider';
import SiteDeco from '@/components/SiteDeco';
import Nav from '@/components/Nav';
import Fx from '@/components/Fx';
import { getSettings, getImgv, publicSite } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const s = await getSettings();
  return { title: s.name + ' — ' + s.tagline, description: s.tagline, metadataBase: new URL(process.env.SITE_URL || process.env.BASE_URL || 'https://flexozy.site') };
}
export const viewport = { themeColor: '#000000' };

export default async function RootLayout({ children }) {
  const s = await getSettings(), site = publicSite(s, await getImgv('_site'));
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Kanit:wght@400;500;600&family=Prompt:wght@400;500;600&family=Sarabun:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProvider initial={site}>
          <SiteDeco />
          <Fx />
          <Nav />
          {children}
          <footer className="foot">{site.footer || `© ${new Date().getFullYear()} ${site.name}`}</footer>
        </AppProvider>
      </body>
    </html>
  );
}
