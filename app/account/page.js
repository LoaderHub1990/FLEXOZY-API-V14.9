import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/shop';
import Account from '@/components/Account';
import { discordConfigured, publicDiscord, publicProfile } from '@/lib/discord';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'บัญชีของฉัน' };

export default async function AccountPage({ searchParams }) {
  const [user, sp, s] = await Promise.all([getUser(), searchParams, getSettings()]);
  const tab = ['topup', 'orders', 'profile', 'security'].includes(sp?.tab) ? sp.tab : 'topup';
  return (
    <div className="wrap">
      <Account
        user={user && { id: user.id, username: user.username, email: user.email, balance: user.balance, discord: publicDiscord(user), profile: publicProfile(user) }}
        discordLogin={discordConfigured()}
        initialTab={tab}
        minTopup={parseInt(s.min_topup, 10) || 10}
        canTrueMoney={!!process.env.TRUEMONEY_MOBILE}
        truemoneyEnabled={s.topup_truemoney_enabled !== '0'}
      />
    </div>
  );
}
