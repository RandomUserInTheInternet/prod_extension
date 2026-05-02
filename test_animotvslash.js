const fetch = require('node-fetch');

async function test() {
    const res = await fetch('https://animotvslash.org/anime/that-time-i-got-reincarnated-as-a-slime-season-4-episode-1/', {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });
    const text = await res.text();
    
    const selectM = text.match(/<select class=["']mirror["'][\s\S]*?<\/select>/i);
    if (selectM) {
        const optionRx = /<option value=["']([^"']+)["'][^>]*>\s*([^<]+)\s*<\/option>/gi;
        let om;
        while ((om = optionRx.exec(selectM[0])) !== null) {
            const b64 = om[1];
            const label = om[2].trim();
            const decoded = Buffer.from(b64, 'base64').toString('utf8');
            const iframeM = decoded.match(/src=["']([^"']+)["']/i);
            const src = iframeM ? iframeM[1] : 'No iframe src';
            console.log(label + ' -> ' + src);
        }
    } else {
        console.log('No select found');
    }
}

test();
