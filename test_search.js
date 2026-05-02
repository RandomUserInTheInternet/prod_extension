const fs = require('fs');
fetch('https://anikototv.to/search?keyword=one+piece').then(r=>r.text()).then(html=>{
   const matches = [...html.matchAll(/href=\"\/watch\/([^\"]+)\" title=\"([^\"]+)\"/g)];
   matches.forEach(m => console.log(m[2], ' -> ', m[1]));
}).catch(console.error);
