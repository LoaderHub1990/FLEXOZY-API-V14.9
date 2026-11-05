import { cookies } from 'next/headers';
import { makeT } from './i18n';

export async function getPrefs() {
  const jar = await cookies();
  return { lang: jar.get('fx_lang')?.value === 'en' ? 'en' : 'th', theme: jar.get('fx_theme')?.value === 'light' ? 'light' : 'dark' };
}
export async function getT() {
  const { lang } = await getPrefs();
  return { t: makeT(lang), lang };
}
