// ย่อ/ครอปรูปในเบราว์เซอร์ก่อนอัปโหลด (ให้ได้ขนาดตรงตามที่หน้าร้านใช้ และไฟล์เล็ก)
export function resizeImage(file, { w, h, mode = 'cover', maxBytes = 880 * 1024 }) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('รองรับเฉพาะไฟล์ JPG / PNG / WebP'));
    if (file.size > 12 * 1024 * 1024) return reject(new Error('ไฟล์ต้นฉบับใหญ่เกิน 12 MB'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let tw = w, th = h;
      if (mode === 'fit') { const k = Math.min(1, w / img.width, h / img.height); tw = Math.round(img.width * k); th = Math.round(img.height * k); }
      const c = document.createElement('canvas'); c.width = tw; c.height = th;
      const g = c.getContext('2d');
      if (mode === 'cover') { const k = Math.max(tw / img.width, th / img.height); const sw = tw / k, sh = th / k; g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, tw, th); }
      else g.drawImage(img, 0, 0, tw, th);
      let q = 0.9, out = '';
      for (let i = 0; i < 6; i++) {
        out = c.toDataURL('image/webp', q);
        if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', q); // เบราว์เซอร์ที่ไม่รองรับ webp
        if (out.length * 0.75 <= maxBytes) break;
        q -= 0.15;
      }
      if (out.length * 0.75 > maxBytes) return reject(new Error('ไฟล์ใหญ่เกินไปแม้บีบอัดแล้ว ลองใช้รูปที่เล็กลง'));
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านไฟล์รูปไม่ได้')); };
    img.src = url;
  });
}

// ขนาดที่หน้าร้านใช้จริงของแต่ละตำแหน่ง
export const IMG_SIZE = {
  banner: { w: 1972, h: 798, label: '1972 × 798 px (≈ 2.5:1)' },
  bannerStudio: { w: 2000, h: 500, label: '2000 × 500 px (4:1)' },
  bg: { w: 1920, h: 1080, label: '1920 × 1080 px (16:9)' },
  logo: { w: 256, h: 256, label: '256 × 256 px (จัตุรัส)' },
  product: { w: 800, h: 800, label: '800 × 800 px (จัตุรัส)' },
  category: { w: 1312, h: 360, label: '1312 × 360 px (≈ 3.6:1)' },
};
