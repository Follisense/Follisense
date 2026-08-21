const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = process.argv[2] || './src/assets';

(async () => {
  if (!fs.existsSync(dir)) {
    console.error(`No ${dir} folder. Run from the repo root.`);
    process.exit(1);
  }

  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
  let done = 0;

  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    const from = path.join(dir, file);
    const to   = path.join(dir, `${base}.webp`);

    try {
      const before = fs.statSync(from).size;
      await sharp(from)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(to);
      const after = fs.statSync(to).size;
      console.log(`${file}  ${Math.round(before/1024)}kb -> ${Math.round(after/1024)}kb`);
      done++;
    } catch (err) {
      console.error(`FAILED ${file}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  console.log(`\n${done} of ${files.length} converted`);
})();