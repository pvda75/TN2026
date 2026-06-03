const fs = require('fs');
const path = require('path');
const https = require('https');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const targetPath = path.join(publicDir, 'opencv.js');
// Dùng CDN cdnjs ổn định hoặc npm unpkg
const url = 'https://cdnjs.cloudflare.com/ajax/libs/opencv.js/4.8.0/opencv.js';

console.log('Downloading opencv.js from: ' + url);
console.log('Target path: ' + targetPath);

const download = (downloadUrl, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(downloadUrl, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download, status code: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('Download complete!');
          resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

download(url, targetPath)
  .then(() => {
    console.log('Successfully saved opencv.js to ' + targetPath);
  })
  .catch((err) => {
    console.error('Error during download:', err);
    process.exit(1);
  });
