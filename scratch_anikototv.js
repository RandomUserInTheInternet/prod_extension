var https = require('https');

var req = https.request("https://megaplay.buzz/api/source/169837", {
    method: 'POST',
    headers: {
        'User-Agent': 'Mozilla/5.0', 
        'Referer': 'https://megaplay.buzz/stream/s-2/169837/sub',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
}, (res) => {
  var d = ''; res.on('data', c=>d+=c); res.on('end', () => console.log('POST api/source:', res.statusCode, d.substring(0, 300)));
});
// Let's pass the cid and cidu from the HTML player data
req.write('id=169837&cid=5553&cidu=69f3c63eb15e8');
req.end();
