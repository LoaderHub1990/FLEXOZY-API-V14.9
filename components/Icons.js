const p = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
export const Door = () => (<svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>);
export const Arrow = () => (<svg {...p} width="18" height="18"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>);
export const Upload = () => (<svg {...p}><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M5 20h14" /></svg>);
export const Menu = () => (<svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const Music = () => (<svg {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>);
export const MusicOff = () => (<svg {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /><path d="M3 3l18 18" /></svg>);
export const Shield = () => (<svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>);
export const Key = () => (<svg {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></svg>);
export const Bolt = () => (<svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>);
export const Palette = () => (<svg {...p}><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.200.2-2.500 1.500-2.500H17a4 4 0 0 0 4-4C21 7 17 3 12 3z" /><circle cx="7.500" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7" r="1" /></svg>);
export const Crown = () => (<svg {...p}><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" /></svg>);
export const Users = () => (<svg {...p}><circle cx="9" cy="8" r="3.500" /><path d="M2.500 20a6.500 6.500 0 0 1 13 0" /><path d="M16 4.500a3.500 3.500 0 0 1 0 7M18 14a6.500 6.500 0 0 1 3.500 6" /></svg>);
export const Trash = () => (<svg {...p} width="16" height="16"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>);
export const Discord = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.300 4.400A19.800 19.800 0 0 0 15.400 3l-.2.5a18 18 0 0 0-6.400 0L8.600 3a19.800 19.800 0 0 0-4.900 1.400C.6 9 0 13.500.3 18a19.900 19.900 0 0 0 6 3l1.300-2.100a13 13 0 0 1-2-1l.5-.4a14.200 14.200 0 0 0 12.200 0l.5.4c-.6.4-1.300.7-2 1L18 21a19.900 19.900 0 0 0 6-3c.4-5.200-.7-9.700-3.700-13.600zM8.500 15.300c-1.200 0-2.100-1.100-2.100-2.400s.9-2.400 2.100-2.400 2.200 1.100 2.100 2.400c0 1.300-.9 2.400-2.100 2.400zm7 0c-1.200 0-2.100-1.100-2.100-2.400s.9-2.400 2.100-2.400 2.200 1.100 2.100 2.400c0 1.300-.9 2.400-2.100 2.400z" /></svg>);

// ไอคอนแบรนด์สำหรับปุ่มลิงก์ (วาดเอง ไม่มีรูปภายนอก)
export const PRESETS = [['youtube', 'YouTube'], ['discord', 'Discord'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['telegram', 'Telegram'], ['x', 'X'], ['website', 'Website']];
export function Brand({ name, size = 22 }) {
  const q = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, style: { flex: 'none' } };
  switch (name) {
    case 'youtube': return <svg {...q}><rect x="1.500" y="4.500" width="21" height="15" rx="4.500" fill="#fff" /><path d="M10 8.900v6.200l5.400-3.100z" fill="#000" /></svg>;
    case 'discord': return <svg {...q}><path fill="#fff" d="M20 5.600A16 16 0 0 0 16 4.300l-.5 1a15 15 0 0 0-4.600 0l-.5-1A16 16 0 0 0 6.400 5.600C3.900 9.400 3.200 13 3.500 16.600a16 16 0 0 0 4.900 2.500l1-1.600a10 10 0 0 1-1.600-.8l.4-.3a11.500 11.500 0 0 0 10.200 0l.4.300c-.5.300-1 .6-1.600.8l1 1.600a16 16 0 0 0 4.900-2.500c.4-4.200-.7-7.900-3.100-11z" /><circle cx="9.200" cy="12.200" r="1.500" fill="#000" /><circle cx="14.800" cy="12.200" r="1.500" fill="#000" /></svg>;
    case 'tiktok': return <svg {...q}><path d="M13.200 5v9.200a2.700 2.700 0 1 1-2.700-2.700M13.200 5c.3 2 1.500 3.100 3.600 3.200" fill="none" stroke="currentColor" strokeWidth="2.200" strokeLinecap="round" /></svg>;
    case 'facebook': return <svg {...q}><circle cx="12" cy="12" r="10.500" fill="#fff" /><path d="M13.300 20v-6.500h2.200l.4-2.700h-2.600V9.200c0-.8.300-1.300 1.400-1.300h1.300V5.500c-.3 0-1.100-.1-2-.1-2 0-3.300 1.200-3.300 3.400v2h-2.200v2.700h2.200V20z" fill="#000" /></svg>;
    case 'instagram': return <svg {...q}><rect x="2.500" y="2.500" width="19" height="19" rx="5.500" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4.300" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.200" cy="6.800" r="1.200" fill="currentColor" /></svg>;
    case 'telegram': return <svg {...q}><circle cx="12" cy="12" r="10.500" fill="#fff" /><path d="M5.800 11.800l11.100-4.300c.5-.2 1 .1.800.9l-1.900 8.900c-.1.600-.5.800-1 .5l-2.900-2.100-1.400 1.400c-.2.200-.3.300-.6.300l.2-3 5.400-4.900c.2-.2 0-.3-.3-.1l-6.700 4.200-2.900-.9c-.6-.2-.6-.6.200-.9z" fill="#000" /></svg>;
    case 'x': return <svg {...q}><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" /></svg>;
    default: return <svg {...q}><circle cx="12" cy="12" r="9.500" fill="none" stroke="currentColor" strokeWidth="1.800" /><path d="M2.500 12h19M12 2.500c3 3.200 3 15.800 0 19M12 2.500c-3 3.200-3 15.800 0 19" fill="none" stroke="currentColor" strokeWidth="1.500" /></svg>;
  }
}
