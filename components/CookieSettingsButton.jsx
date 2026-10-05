'use client';
import { useShell } from './Shell';

export default function CookieSettingsButton() {
  const { openCookies } = useShell();
  return <button className="btn" onClick={openCookies}>เปลี่ยนการตั้งค่าคุกกี้</button>;
}
