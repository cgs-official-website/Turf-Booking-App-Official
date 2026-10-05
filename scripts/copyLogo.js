const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcLogo = path.join(rootDir, 'logo.png');

if (!fs.existsSync(srcLogo)) {
  console.error('Source logo.png not found at:', srcLogo);
  process.exit(1);
}

const targets = [
  'TurfUserApp/android/app/src/main/res/drawable/ic_notification_large.png',
  'TurfUserApp/android/app/src/main/res/drawable-hdpi/ic_notification_large.png',
  'TurfUserApp/android/app/src/main/res/drawable-mdpi/ic_notification_large.png',
  'TurfUserApp/android/app/src/main/res/drawable-xhdpi/ic_notification_large.png',
  'TurfUserApp/android/app/src/main/res/drawable-xxhdpi/ic_notification_large.png',
  'TurfUserApp/android/app/src/main/res/drawable-xxxhdpi/ic_notification_large.png',
  'TurfVendorApp/android/app/src/main/res/drawable/ic_notification_large.png',
  'TurfVendorApp/android/app/src/main/res/drawable-hdpi/ic_notification_large.png',
  'TurfVendorApp/android/app/src/main/res/drawable-mdpi/ic_notification_large.png',
  'TurfVendorApp/android/app/src/main/res/drawable-xhdpi/ic_notification_large.png',
  'TurfVendorApp/android/app/src/main/res/drawable-xxhdpi/ic_notification_large.png',
  'TurfVendorApp/android/app/src/main/res/drawable-xxxhdpi/ic_notification_large.png',
];

targets.forEach((rel) => {
  const dest = path.join(rootDir, rel);
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(srcLogo, dest);
  console.log(`✅ Copied logo to: ${rel}`);
});

console.log('🎉 Logo assets updated successfully for both apps!');
