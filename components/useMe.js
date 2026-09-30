'use client';
import { useEffect, useState } from 'react';
// undefined = กำลังโหลด, null = ยังไม่ล็อกอิน
export default function useMe() {
  const [me, setMe] = useState(undefined);
  useEffect(() => { let d = false; fetch('/api/me').then((r) => r.json()).then((j) => !d && setMe(j.data || null)).catch(() => !d && setMe(null)); return () => { d = true; }; }, []);
  return me;
}
