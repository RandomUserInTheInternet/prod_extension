var https = require('https');
https.get('https://epeng.animeapps.top/api2.php?epid=154587', {headers: {
  'Referer': 'https://anibd.app/',
  'User-Agent': 'Mozilla/5.0'
}}, (res) => {
  var d = ''; res.on('data', c=>d+=c); res.on('end', () => console.log(JSON.stringify(JSON.parse(d).map(s => s.server_name))));
});
