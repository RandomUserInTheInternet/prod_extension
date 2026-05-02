var https = require('https');
var crypto = require('crypto');

function fetch(url, ref) {
  return new Promise((resolve) => {
    var u = new URL(url);
    https.get({hostname:u.hostname, path:u.pathname+u.search, headers:{
      'User-Agent':'Mozilla/5.0', 'Referer': ref || '', 'Accept':'*/*'
    }}, (res) => { var d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); });
  });
}

function unflatten(index, arr) {
  if (typeof index !== 'number' || index < 0 || index >= arr.length) return index;
  var val = arr[index];
  if (Array.isArray(val)) return val.map(v => unflatten(v, arr));
  else if (val && typeof val === 'object') {
    var obj = {}; for (var k in val) obj[k] = unflatten(val[k], arr); return obj;
  }
  return val;
}

(async () => {
  var raw = await fetch('https://zencloudz.cc/e/44i6pe1b0j0d/__data.json?v=2&a=0', 'https://kuudere.to/');
  var zenData = JSON.parse(raw);
  var dataArray = zenData.nodes[3].data;
  var decoded = unflatten(0, dataArray);
  
  var seed = decoded.obfuscation_seed;
  var eStr = crypto.createHash('sha256').update(seed).digest('hex');
  
  var videoField = 'vf_' + eStr.substring(0,8);
  console.log('videoField:', videoField);
  console.log('Exists in decoded?:', !!decoded[videoField]);
  if (decoded[videoField]) console.log('Value:', decoded[videoField].substring(0, 50));
  
  var obf = decoded.obfuscated_crypto_data;
  var cName = 'cd_' + eStr.substring(24,32);
  var aName = 'ad_' + eStr.substring(32,40);
  var oName = 'od_' + eStr.substring(40,48);
  var inner = obf[cName][aName][0][oName];
  
  console.log('Exists in inner?:', !!inner[videoField]);
  if (inner[videoField]) console.log('Value:', inner[videoField].substring(0, 50));
  
})();
