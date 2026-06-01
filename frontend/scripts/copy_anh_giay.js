const fs = require('fs');
const path = require('path');

const src = path.join('C:', 'Users', 'ler64', 'OneDrive', 'Máy tính', 'ĐATN', 'ảnh', 'anh_giay');
const dest = path.join('C:', 'Users', 'ler64', 'OneDrive', 'Máy tính', 'ĐATN', 'OutPut_V3', 'frontend', 'public', 'anh_giay');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

try {
  ensureDir(dest);
  const files = fs.readdirSync(src);
  files.forEach((f) => {
    const s = path.join(src, f);
    const d = path.join(dest, f);
    try {
      fs.copyFileSync(s, d);
      console.log('copied', f);
    } catch (e) {
      console.error('error copying', f, e.message);
    }
  });
  console.log('Done');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
