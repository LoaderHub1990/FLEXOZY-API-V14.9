import './globals.css';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/shop';
import Shell from '@/components/Shell';
import Effects from '@/components/Effects';
import { discordConfigured, publicDiscord, publicProfile } from '@/lib/discord';

export const dynamic = 'force-dynamic';

const SITE = (process.env.SITE_URL || 'https://flexozy.site').replace(/\/+$/, '');

// พรีวิวลิงก์ (Discord / Facebook / LINE / X ฯลฯ): ชื่อ + คำอธิบาย + รูปแบนเนอร์
export async function generateMetadata() {
  const s = await getSettings();
  const title = s.meta_title || s.shop_name;
  const description = s.meta_description || s.tagline;
  const image = s.og_image || '/og.jpg';
  const images = [{ url: image, width: 1600, height: 640, alt: title }];
  return {
    metadataBase: new URL(SITE),
    title: { default: title, template: `%s · ${s.shop_name}` },
    description,
    icons: { icon: '/favicon.ico' },
    alternates: { canonical: '/' },
    openGraph: { type: 'website', url: SITE + '/', siteName: s.shop_name, title, description, images, locale: 'th_TH' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

// ใส่คลาส js ก่อนวาดหน้าแรก (ให้เอฟเฟกต์โผล่ทำงาน) และกันค้างถ้า JS ไม่ทำงาน
const earlyScript = `document.documentElement.classList.add('js');setTimeout(function(){if(document.documentElement.dataset.ready!=='1')document.documentElement.classList.add('rv-fb')},6000);`;

export default async function RootLayout({ children }) {
  const [user, settings] = await Promise.all([getUser(), getSettings()]);
  const u = user && { id: user.id, username: user.username, role: user.role, balance: user.balance, discord: publicDiscord(user), profile: publicProfile(user) };
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#5d30d9" />
        <script dangerouslySetInnerHTML={{ __html: earlyScript }} />
      </head>
      <body>
        {/* หน้าโหลดตอนเข้าเว็บ — ถูกถอดออกโดย <Effects/> เมื่อโหลดเสร็จ */}
        <div id="boot" aria-hidden="true">
          <div className="boot-in">
            <div className="boot-logo">
              <span className="boot-glow" />
              <span className="boot-ring" />
              {settings.logo ? <img src={settings.logo} alt="" /> : null}
            </div>
            <div className="boot-name">{settings.shop_name}</div>
            <div className="boot-bar"><i /></div>
          </div>
        </div>
        {/* แสงสปอตไลต์เฉียงด้านหลัง (โทนเดียวกับต้นฉบับ) */}
        <div className="spot" aria-hidden="true"><i /><i /><i /></div>
        <Effects />
        <Shell user={u} settings={settings} discordLogin={discordConfigured()}>{children}</Shell>
      </body>
    </html>
  );
}
