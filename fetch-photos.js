const fs = require('fs');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const queries = ['indian-professor', 'indian-man-suit', 'indian-student-portrait', 'indian-mature-man'];
  for (const q of queries) {
    const html = await fetchUrl('https://unsplash.com/s/photos/' + q);
    const matches = html.match(/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+/g) || [];
    const unique = [...new Set(matches)].slice(0, 8);
    console.log('Query:', q, 'Found:', unique.length);
    unique.forEach(u => console.log('  ', u));
  }
}

run().catch(console.error);
