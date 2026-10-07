// compress-media — сжатие картинок сайта без смены имён и форматов. @gdeprostotamangelovsto
// Запуск: npm run media:compress  (нужен sharp: npm i -D sharp)
// Видео жмутся отдельно ffmpeg-ом, рецепт — ниже в комментарии.
// Сжатие изображений в public/ без смены имён и форматов.
// PNG → палитра (imagequant, 256 цветов, альфа сохраняется), JPG → mozjpeg q82 progressive.
// Пишет новый файл только если он меньше исходного.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'public';
const SKIP = new Set(['favicon-32.png', 'favicon-64.png', 'apple-touch-icon.png']);
const rows = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(png|jpe?g)$/i.test(e.name) && !SKIP.has(e.name)) rows.push(p);
  }
}
walk(root);

(async () => {
  let before = 0, after = 0;
  for (const p of rows) {
    const src = fs.readFileSync(p);
    const ext = path.extname(p).toLowerCase();
    let out;
    if (ext === '.png') {
      out = await sharp(src).png({ palette: true, quality: 85, effort: 10, compressionLevel: 9 }).toBuffer();
    } else {
      out = await sharp(src).rotate().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer();
    }
    before += src.length;
    if (out.length < src.length * 0.97) {
      fs.writeFileSync(p, out);
      after += out.length;
      console.log(`${(src.length / 1024).toFixed(0).padStart(6)}K → ${(out.length / 1024).toFixed(0).padStart(6)}K  ${path.relative(root, p)}`);
    } else {
      after += src.length;
      console.log(`  keep ${(src.length / 1024).toFixed(0).padStart(6)}K           ${path.relative(root, p)}`);
    }
  }
  console.log(`\nIMAGES: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB (-${(100 - after / before * 100).toFixed(0)}%)`);
})();

// Видео (ffmpeg): без звука, H.264, faststart, 60fps → 30fps, широкие ролики сетки → 1280px.
//   ffmpeg -i in.mp4 -an -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart \
//          -vf "scale=1280:-2,fps=30" out.mp4
//   hero-ivi.mp4 — то же, но -crf 24 и без scale.
