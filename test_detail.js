const fs = require('fs');
fetch('https://anikototv.to/ajax/episode/list/1057', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' }
}).then(r=>r.json()).then(data => { 
    fs.writeFileSync('test_ep_list.html', data.result);
}).catch(console.error);
