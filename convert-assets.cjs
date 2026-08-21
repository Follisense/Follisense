const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'src', 'assets');

async function convertDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await convertDirectory(fullPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();

    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      continue;
    }

    const outputPath = path.join(
      dir,
      `${path.basename(entry.name, ext)}.webp`
    );

    try {
      await sharp(fullPath)
        .webp({ quality: 85 })
        .toFile(outputPath);

      console.log(`✓ ${path.relative(assetsDir, fullPath)} → ${path.relative(assetsDir, outputPath)}`);
    } catch (error) {
      console.error(`✗ Failed: ${fullPath}`);
      console.error(error.message);
    }
  }
}

convertDirectory(assetsDir)
  .then(() => console.log('\nDone!'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });