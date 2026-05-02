var https = require('https');
https.get('https://anihq.org/wp-json/wp/v2/anime?per_page=1', (res) => {
  var d = ''; res.on('data', c=>d+=c);
  res.on('end', () => {
    var slug = JSON.parse(d)[0].slug;
    https.get('https://anihq.org/anime-show/' + slug + '/', (res2) => {
      var d2 = ''; res2.on('data', c=>d2+=c);
      res2.on('end', () => {
        var match = d2.match(/href=["'](https:\/\/anihq\.org\/watch\/[^"']+)["']/);
        if (match) {
          https.get(match[1], (res3) => {
            var d3 = ''; res3.on('data', c=>d3+=c);
            res3.on('end', () => {
              var ifr = d3.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i);
              console.log('Iframe:', ifr ? ifr[1] : 'none');
            });
          });
        }
      });
    });
  });
});
