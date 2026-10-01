import '../globals.css';
import '../ui.css';
import '../fx.css';
import AppProvider from '@/components/AppProvider';
import { getSettings, getImgv, publicSite } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const viewport = { themeColor: '#000000' };
export async function generateMetadata() { const s = await getSettings(); return { title: s.name + ' — Get Key', robots: { index: false } }; }

export default async function GetKeyLayout({ children }) {
  const site = publicSite(await getSettings(), await getImgv('_site'));
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=+localStorage.getItem('fx_sc'),v=localStorage.getItem('fx_scv')||'0';if(t&&v==='" + site.sc.v + "'&&Date.now()-t<" + site.sc.m * 60000 + ")document.documentElement.classList.add('sc-ok')}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Kanit:wght@400;500;600&family=Prompt:wght@400;500;600&family=Sarabun:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="gkbody">
        <AppProvider initial={site} noMe>{children}</AppProvider>
      </body>
    </html>
  );
}
