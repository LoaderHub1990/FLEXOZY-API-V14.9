'use client';
import Link from 'next/link';
import Icon from './Icons';
import { useShell } from './Shell';

export default function HeroButtons() {
  const { openSearch } = useShell();
  return (
    <>
      <button className="search-btn" onClick={openSearch}>
        <Icon n="search" size={18} /><span>ค้นหาสินค้าหรือหมวดหมู่</span><span className="kbd">ค้นหา</span>
      </button>
      <Link href="/store" className="btn btn-primary cta">เลือกซื้อสินค้า <Icon n="arrow" size={18} /></Link>
    </>
  );
}
