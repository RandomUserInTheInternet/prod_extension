var https = require('https');
var url = "https://richardquestionbuilding.com/access/eyJpdiI6InM2a3ZZd3IrK2ZORFYxWkJVNWNZMXc9PSIsInZhbHVlIjoic2JOZ2VSR1p5V2xYMDFaWDFUcTUrazFFMWVVTk43cGlLSW45aUZJSDVTbE9uM0lRclMvMzhkQjRuYmhleFlkL2k5dC9BbFhaT2ZJODl6Qnovd0N0WFpHKzB0MjFjUkdKZDd0SEhVQjFPY1U9IiwibWFjIjoiZWU4MjAxZWI2MzIyOWUzOTVkYTg3NDZmZDU5MDUwZTE0Y2JhNWNmOTIwM2I1YmFlMmJiZWE2MmExNDFiNzdhZCIsInRhZyI6IiJ9?o=1";
https.get(url, {headers: {'User-Agent': 'Mozilla/5.0'}}, (res) => {
  var d = ''; res.on('data', c=>d+=c); res.on('end', () => console.log(d.substring(d.length - 2000)));
});
