var https = require('https');
https.get('https://anihq.org/watch/sousou-no-frieren-2nd-season-episode-1-english-subbed/', {headers: {'User-Agent': 'Mozilla/5.0'}}, (res) => {
  var d = ''; res.on('data', c=>d+=c); res.on('end', () => {
    var iframes = d.match(/<iframe[^>]+src=['"]([^'"]+)['"]/gi) || [];
    console.log('Iframes:', iframes);
  });
});
