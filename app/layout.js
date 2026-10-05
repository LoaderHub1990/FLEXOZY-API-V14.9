import './globals.css';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/shop';
import Shell from '@/components/Shell';
import Effects from '@/components/Effects';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const s = await getSettings();
  return { title: s.shop_name, description: s.tagline, icons: { icon: '/favicon.ico' } };
}

// ใส่คลาส js ก่อนวาดหน้าแรก (ให้เอฟเฟกต์โผล่ทำงาน) และกันค้างถ้า JS ไม่ทำงาน
const earlyScript = `document.documentElement.classList.add('js');setTimeout(function(){if(document.documentElement.dataset.ready!=='1')document.documentElement.classList.add('rv-fb')},6000);`;

export default async function RootLayout({ children }) {
  const [user, settings] = await Promise.all([getUser(), getSettings()]);
  const u = user && { id: user.id, username: user.username, role: user.role, balance: user.balance };
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0c0c0d" />
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
        <Shell user={u} settings={settings}>{children}</Shell>
      </body>
    </html>
  );
}
