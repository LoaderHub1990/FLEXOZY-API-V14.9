'use client';
import { useApp } from './AppProvider';
import { Backdrop, MusicPlayer } from './Media';
import { resolveMedia } from '@/lib/theme';

// พื้นหลัง + เพลงของทั้งเว็บ (ตั้งได้ในหน้า Admin > ตั้งค่าเว็บ)
export default function SiteDeco() {
  const { site } = useApp();
  const th = site.theme, media = resolveMedia('_site', th, site.imgv);
  return (
    <>
      <Backdrop theme={th} media={media} />
      <MusicPlayer src={media.music} vol={th.music.vol} auto={th.music.auto} title={th.music.title} />
    </>
  );
}
