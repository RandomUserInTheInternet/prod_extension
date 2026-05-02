var https = require('https');
https.get('https://playeng.animeapps.top/r2/play2.php?id=ani6&url=114872_html_5_2', {headers: {'Referer': 'https://anibd.app/', 'User-Agent': 'Mozilla/5.0'}}, (res) => {
  console.log('Set-Cookie:', res.headers['set-cookie']);
});
