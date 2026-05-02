var https = require('https');
https.get('https://epeng.animeapps.top/api2.php?epid=114872', {headers: {'Referer': 'https://anibd.app/', 'User-Agent': 'Mozilla/5.0'}}, (res) => {
  var d = ''; res.on('data', c=>d+=c); res.on('end', () => console.log(d));
});
