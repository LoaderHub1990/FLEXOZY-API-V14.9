import './globals.css';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/shop';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const s = await getSettings();
  return { title: s.shop_name, description: s.tagline, icons: { icon: '/favicon.ico' } };
}

export default async function RootLayout({ children }) {
  const [user, settings] = await Promise.all([getUser(), getSettings()]);
  const u = user && { id: user.id, username: user.username, role: user.role, balance: user.balance };
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Shell user={u} settings={settings}>{children}</Shell>
      </body>
    </html>
  );
}
