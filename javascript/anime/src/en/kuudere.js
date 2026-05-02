const mangayomiSources = [{
    "name": "Kuudere [!]",
    "lang": "en",
    "baseUrl": "https://kuudere.to",
    "apiUrl": "https://kuudere.to",
    "iconUrl": "https://kuudere.to/favicon.ico",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.9",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": true,
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/prod_extension/main/javascript/anime/src/en/kuudere.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 847291854,
    "notes": "Kuudere [!]",
    "pkgPath": "anime/src/en/kuudere.js"
}];

// ============ Pure JS SHA-256 ============
var _sha256K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];
function _sha256(msg) {
    var bytes = [];
    for (var i = 0; i < msg.length; i++) {
        var c = msg.charCodeAt(i);
        if (c < 128) bytes.push(c);
        else if (c < 2048) { bytes.push(192 | (c >> 6)); bytes.push(128 | (c & 63)); }
        else { bytes.push(224 | (c >> 12)); bytes.push(128 | ((c >> 6) & 63)); bytes.push(128 | (c & 63)); }
    }
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    bytes.push(0, 0, 0, 0);
    bytes.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    function rr(v, n) { return (v >>> n) | (v << (32 - n)); }
    for (var off = 0; off < bytes.length; off += 64) {
        var W = [];
        for (var t = 0; t < 16; t++) W[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
        for (var t = 16; t < 64; t++) {
            var s0 = rr(W[t - 15], 7) ^ rr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
            var s1 = rr(W[t - 2], 17) ^ rr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
            W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
        }
        var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
        for (var t = 0; t < 64; t++) {
            var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + _sha256K[t] + W[t]) | 0;
            var S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) | 0;
            h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var hex = '';
    for (var i = 0; i < 8; i++) hex += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
    return hex;
}

// ============ Pure JS AES-CBC Decryption ============
var _SBOX = [99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22];
var _ISBOX = new Array(256); for (var _i = 0; _i < 256; _i++)_ISBOX[_SBOX[_i]] = _i;
var _RCON = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54];
function _xtime(a) { return ((a << 1) ^ (a & 128 ? 0x1b : 0)) & 0xff; }
function _mul(a, b) { var r = 0; for (var i = 0; i < 8; i++) { if (b & 1) r ^= a; a = _xtime(a); b >>= 1; } return r; }
function _aesExpandKey(key) {
    var Nk = key.length / 4, Nr = Nk + 6, W = new Uint8Array(16 * (Nr + 1));
    for (var i = 0; i < key.length; i++)W[i] = key[i];
    for (var i = Nk; i < 4 * (Nr + 1); i++) {
        var t = [W[(i - 1) * 4], W[(i - 1) * 4 + 1], W[(i - 1) * 4 + 2], W[(i - 1) * 4 + 3]];
        if (i % Nk === 0) { var tmp = t[0]; t[0] = _SBOX[t[1]] ^ _RCON[i / Nk - 1]; t[1] = _SBOX[t[2]]; t[2] = _SBOX[t[3]]; t[3] = _SBOX[tmp]; }
        else if (Nk > 6 && i % Nk === 4) { t[0] = _SBOX[t[0]]; t[1] = _SBOX[t[1]]; t[2] = _SBOX[t[2]]; t[3] = _SBOX[t[3]]; }
        W[i * 4] = W[(i - Nk) * 4] ^ t[0]; W[i * 4 + 1] = W[(i - Nk) * 4 + 1] ^ t[1]; W[i * 4 + 2] = W[(i - Nk) * 4 + 2] ^ t[2]; W[i * 4 + 3] = W[(i - Nk) * 4 + 3] ^ t[3];
    }
    return { w: W, nr: Nr };
}
function _aesDecryptBlock(block, ek) {
    var s = new Uint8Array(16), Nr = ek.nr, W = ek.w;
    for (var i = 0; i < 16; i++)s[i] = block[i] ^ W[Nr * 16 + i];
    for (var r = Nr - 1; r >= 0; r--) {
        var t = s[13]; s[13] = s[9]; s[9] = s[5]; s[5] = s[1]; s[1] = t;
        t = s[10]; s[10] = s[2]; s[2] = t; t = s[14]; s[14] = s[6]; s[6] = t;
        t = s[3]; s[3] = s[7]; s[7] = s[11]; s[11] = s[15]; s[15] = t;
        for (var i = 0; i < 16; i++)s[i] = _ISBOX[s[i]];
        for (var i = 0; i < 16; i++)s[i] ^= W[r * 16 + i];
        if (r > 0) {
            var ns = new Uint8Array(16);
            for (var c = 0; c < 4; c++) {
                var j = c * 4;
                ns[j] = _mul(14, s[j]) ^ _mul(11, s[j + 1]) ^ _mul(13, s[j + 2]) ^ _mul(9, s[j + 3]);
                ns[j + 1] = _mul(9, s[j]) ^ _mul(14, s[j + 1]) ^ _mul(11, s[j + 2]) ^ _mul(13, s[j + 3]);
                ns[j + 2] = _mul(13, s[j]) ^ _mul(9, s[j + 1]) ^ _mul(14, s[j + 2]) ^ _mul(11, s[j + 3]);
                ns[j + 3] = _mul(11, s[j]) ^ _mul(13, s[j + 1]) ^ _mul(9, s[j + 2]) ^ _mul(14, s[j + 3]);
            }
            s = ns;
        }
    }
    return s;
}
function _aesDecryptCBC(ct, key, iv) {
    var ek = _aesExpandKey(key), out = [];
    var prev = iv;
    for (var off = 0; off < ct.length; off += 16) {
        var block = ct.slice(off, off + 16);
        var dec = _aesDecryptBlock(block, ek);
        for (var i = 0; i < 16; i++)dec[i] ^= prev[i];
        for (var i = 0; i < 16; i++)out.push(dec[i]);
        prev = block;
    }
    var pad = out[out.length - 1];
    if (pad > 0 && pad <= 16) { var valid = true; for (var i = 0; i < pad; i++)if (out[out.length - 1 - i] !== pad) valid = false; if (valid) out.splice(out.length - pad, pad); }
    return out;
}
function _b64Decode(str) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var out = []; str = str.replace(/[=]+$/, '');
    for (var i = 0, b = 0, bits = 0; i < str.length; i++) {
        b = (b << 6) | chars.indexOf(str[i]); bits += 6;
        while (bits >= 8) { bits -= 8; out.push((b >> bits) & 0xff); }
    }
    return new Uint8Array(out);
}

// ============ Extension ============
class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    getPreference(key) {
        try { return new SharedPreferences().get(key); } catch (e) { return null; }
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://kuudere.to/",
            "Accept": "application/json, text/plain, */*"
        };
    }

    unflatten(index, arr, cache) {
        if (!cache) cache = new Map();
        if (typeof index !== "number" || index < 0 || index >= arr.length) return index;
        if (cache.has(index)) return cache.get(index);
        var val = arr[index];
        if (Array.isArray(val)) {
            var res = [];
            cache.set(index, res);
            for (var i = 0; i < val.length; i++) res.push(this.unflatten(val[i], arr, cache));
            return res;
        } else if (val && typeof val === "object") {
            var obj = {};
            cache.set(index, obj);
            for (var k in val) obj[k] = this.unflatten(val[k], arr, cache);
            return obj;
        }
        return val;
    }

    async getPopular(page) {
        var res = await this.client.get("https://kuudere.to/api/top/anime?tab=today&limit=20", this.getHeaders());
        var data = JSON.parse(res.body);
        var items = data.data || [];
        var list = [];
        for (var item of items) {
            var id = item.url ? item.url.replace("/anime/", "") : "";
            list.push({ name: item.title || "", imageUrl: item.image || "", link: id });
        }
        return { list: list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        var queryStr = page > 1 ? "?page=" + page : "";
        var res = await this.client.get("https://kuudere.to/recently-updated/__data.json" + queryStr, this.getHeaders());
        var rawData = JSON.parse(res.body);
        var dataArray = rawData.nodes[1].data;
        var decoded = this.unflatten(0, dataArray);
        var items = decoded.animeData || [];
        var list = [];
        for (var item of items) {
            list.push({
                name: item.english || item.romaji || item.native || "",
                imageUrl: item.cover || "",
                link: item.id || ""
            });
        }
        var hasNext = decoded.currentPage < decoded.totalPages;
        return { list: list, hasNextPage: hasNext };
    }

    // FIX: Use /api/search which returns relevance-ranked results.
    // The old __data.json endpoint returned 446+ results sorted by global popularity,
    // so "Witch Hat Atelier" search returned Frieren first â€” completely wrong match.
    async search(query, page, filters) {
        try {
            var res = await this.client.get(
                "https://kuudere.to/api/search?q=" + encodeURIComponent(query),
                this.getHeaders()
            );
            var data = JSON.parse(res.body);
            var results = data.results || [];
            var list = [];
            for (var item of results) {
                list.push({
                    name: item.title || "",
                    imageUrl: item.coverImage || "",
                    link: item.id || ""
                });
            }
            return { list: list, hasNextPage: data.hasMore || false };
        } catch (e) {
            console.log("Kuudere [!]" + e);
            return { list: [], hasNextPage: false };
        }
    }

    // Episodes returned DESCENDING (newest first).
    // Nuord app does .reversed.toList() â†’ ep1 at index 0 â†’ Anify alignment correct.
    async getDetail(url) {
        try {
            var res = await this.client.get("https://kuudere.to/api/watch/" + url + "/1", this.getHeaders());
            var data = JSON.parse(res.body);

            var name = "", imageUrl = "", description = "", genre = [], status = 0, chapters = [];

            if (data.anime_info) {
                var info = data.anime_info;
                name = info.english || info.romaji || info.native || "";
                imageUrl = info.cover || "";
                description = info.description || "";
                genre = info.genres || [];
                var s = info.status || "";
                if (s === "FINISHED") status = 1;
                else if (s === "RELEASING") status = 0;
                else if (s === "NOT_YET_RELEASED") status = 2;
                else if (s === "CANCELLED") status = 3;
            }

            if (data.all_episodes && Array.isArray(data.all_episodes)) {
                for (var ep of data.all_episodes) {
                    chapters.push({
                        name: "Episode " + ep.number,
                        url: url + "/" + ep.number
                    });
                }
            }

            // Sort DESCENDING by episode number (newest first)
            chapters.sort(function (a, b) {
                var na = parseInt(a.url.split("/").pop()) || 0;
                var nb = parseInt(b.url.split("/").pop()) || 0;
                return nb - na;
            });

            return { name, imageUrl, description, genre, status, chapters };

        } catch (e) {
            console.log("Kuudere [!]" + e);
            return { name: "", imageUrl: "", description: "", genre: [], status: 0, chapters: [] };
        }
    }

    async getVideoList(url) {
        var res = await this.client.get("https://kuudere.to/api/watch/" + url, this.getHeaders());
        var data = JSON.parse(res.body);

        var prefDubType = this.getPreference("kuudere_stream_subdub_type");
        if (!prefDubType || prefDubType.length === 0) prefDubType = ["sub", "dub"];

        var prefServer = this.getPreference("kuudere_stream_server");
        if (!prefServer || prefServer.length === 0) prefServer = ["Zen", "Zen-2"];

        var list = [];
        if (data.episode_links && Array.isArray(data.episode_links)) {
            for (var link of data.episode_links) {
                if (!prefServer.includes(link.serverName)) continue;
                if (!prefDubType.includes(link.dataType)) continue;

                var originalUrl = link.dataLink;
                var quality = link.serverName + " (" + link.dataType + ")";

                // Extract subtitle params from URL
                var subtitles = [];
                if (originalUrl.includes("?")) {
                    var queryStr = originalUrl.split("?")[1];
                    var params = queryStr.split("&");
                    var captionMap = {}, subMap = {};
                    for (var i = 0; i < params.length; i++) {
                        var kv = params[i].split("=");
                        if (kv.length !== 2) continue;
                        var k = decodeURIComponent(kv[0]);
                        var v = decodeURIComponent(kv[1]);
                        if (k.startsWith("caption_")) captionMap[k.split("_")[1]] = v;
                        else if (k.startsWith("sub_")) subMap[k.split("_")[1]] = v;
                    }
                    for (var idx in captionMap) {
                        var label = subMap[idx] || "Subtitle " + idx;
                        if (!label.toLowerCase().includes("eng")) continue;
                        subtitles.push({ file: captionMap[idx], label: label });
                    }
                }

                // ZenCloudz HLS extraction
                if (originalUrl.includes("zencloudz.cc/e/")) {
                    try {
                        var baseUrl = originalUrl.split("?")[0];
                        var qparams = originalUrl.split("?")[1] || "";
                        var zenUrl = baseUrl + "/__data.json" + (qparams ? "?" + qparams : "");

                        var zenRes = await this.client.get(zenUrl, {
                            "User-Agent": this.getHeaders()["User-Agent"],
                            "Referer": "https://kuudere.to/",
                            "Accept": "*/*"
                        });

                        var zenData = JSON.parse(zenRes.body);
                        var dataArray = null;
                        for (var n = 0; n < zenData.nodes.length; n++) {
                            if (zenData.nodes[n] && zenData.nodes[n].data) dataArray = zenData.nodes[n].data;
                        }
                        if (!dataArray) continue;

                        var decoded = this.unflatten(0, dataArray);
                        var seed = decoded.obfuscation_seed;

                        // Zen subtitles
                        var zenSubs = [];
                        if (decoded.subtitles && Array.isArray(decoded.subtitles)) {
                            for (var sub of decoded.subtitles) {
                                if (sub && sub.url && sub.language) {
                                    if (!sub.language.toLowerCase().includes("eng")) continue;
                                    zenSubs.push({ file: sub.url, label: sub.language });
                                }
                            }
                        }

                        if (!seed) continue;

                        var eStr = _sha256(seed);
                        var sStr = _sha256(eStr);

                        var tokenField = eStr.substring(48, 64) + '_' + eStr.substring(56, 64);
                        var keyFrag2Field = sStr.substring(0, 16) + '_' + sStr.substring(16, 24);
                        var containerName = "cd_" + eStr.substring(24, 32);
                        var arrayName = "ad_" + eStr.substring(32, 40);
                        var objectName = "od_" + eStr.substring(40, 48);
                        var keyField = "kf_" + eStr.substring(8, 16);
                        var ivField = "ivf_" + eStr.substring(16, 24);

                        var oHashParam = parseInt(seed.substring(0, 8), 16);

                        var tokenId = decoded[tokenField];
                        var frag2B64 = decoded[keyFrag2Field];
                        if (!tokenId) continue;

                        var obfData = decoded.obfuscated_crypto_data;
                        var container = obfData[containerName];
                        var arr = container[arrayName];
                        var innerObj = arr[0][objectName];

                        var frag1B64 = innerObj[keyField];
                        var ivB64 = innerObj[ivField];

                        var apiRes = await this.client.get("https://zencloudz.cc/api/m3u8/" + tokenId, {
                            "User-Agent": this.getHeaders()["User-Agent"],
                            "Referer": originalUrl,
                            "Accept": "*/*"
                        });

                        var apiData = JSON.parse(apiRes.body);
                        var videoB64 = apiData.video_b64;
                        var frag3B64 = apiData.key_frag;

                        var frag1 = _b64Decode(frag1B64);
                        var frag2 = _b64Decode(frag2B64);
                        var frag3 = _b64Decode(frag3B64);
                        var ivBytes = _b64Decode(ivB64);
                        var cipherBytes = _b64Decode(videoB64);

                        var keyLen = frag1.length;
                        var aesKey = new Uint8Array(keyLen);
                        for (var i = 0; i < keyLen; i++) {
                            var sboxVal = (((i & 255) * 37 + oHashParam) & 255);
                            aesKey[i] = frag1[i] ^ frag2[i] ^ frag3[i] ^ sboxVal;
                        }

                        var decBytes = _aesDecryptCBC(cipherBytes, aesKey, ivBytes);
                        var decryptedUrl = "";
                        for (var i = 0; i < decBytes.length; i++) decryptedUrl += String.fromCharCode(decBytes[i]);

                        if (decryptedUrl && decryptedUrl.includes(".m3u8")) {
                            var allSubs = subtitles.concat(zenSubs);
                            try {
                                var masterRes = await this.client.get(decryptedUrl, {
                                    "User-Agent": this.getHeaders()["User-Agent"],
                                    "Referer": "https://zencloudz.cc/",
                                    "Accept": "*/*"
                                });
                                var masterText = masterRes.body;
                                if (masterText.includes("RESOLUTION=")) {
                                    // Add Auto (master playlist)
                                    var autoObj = {
                                        url: decryptedUrl,
                                        originalUrl: decryptedUrl,
                                        quality: quality + " - Auto",
                                        headers: { "Referer": "https://zencloudz.cc/" }
                                    };
                                    if (allSubs.length > 0) autoObj.subtitles = allSubs;
                                    list.push(autoObj);

                                    var lines = masterText.split("\n");
                                    var currentResolution = "";
                                    for (var i = 0; i < lines.length; i++) {
                                        var line = lines[i].trim();
                                        if (line.startsWith("#EXT-X-STREAM-INF:")) {
                                            var resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                                            if (resMatch) currentResolution = resMatch[1] + "p";
                                        } else if (line.length > 0 && !line.startsWith("#")) {
                                            var streamUrl = line.startsWith("http") ? line : decryptedUrl.substring(0, decryptedUrl.lastIndexOf("/") + 1) + line;
                                            var resQuality = quality + (currentResolution ? " - " + currentResolution : "");
                                            var videoObj = {
                                                url: streamUrl,
                                                originalUrl: streamUrl,
                                                quality: resQuality,
                                                headers: { "Referer": "https://zencloudz.cc/" }
                                            };
                                            if (allSubs.length > 0) videoObj.subtitles = allSubs;
                                            list.push(videoObj);
                                            currentResolution = "";
                                        }
                                    }
                                } else {
                                    var videoObj = {
                                        url: decryptedUrl,
                                        originalUrl: decryptedUrl,
                                        quality: quality,
                                        headers: { "Referer": "https://zencloudz.cc/" }
                                    };
                                    if (allSubs.length > 0) videoObj.subtitles = allSubs;
                                    list.push(videoObj);
                                }
                            } catch (e) {
                                console.log("M3U8 Parse Error: " + e);
                                var videoObj = {
                                    url: decryptedUrl,
                                    originalUrl: decryptedUrl,
                                    quality: quality + " (Auto)",
                                    headers: { "Referer": "https://zencloudz.cc/" }
                                };
                                if (allSubs.length > 0) videoObj.subtitles = allSubs;
                                list.push(videoObj);
                            }
                            continue;
                        }
                    } catch (e) {
                        console.log("Kuudere [!]" + e);
                    }
                }

                // Fallback: push embed URL
                var fallbackObj = {
                    url: originalUrl,
                    originalUrl: originalUrl,
                    quality: quality + " (Embed)",
                    headers: this.getHeaders()
                };
                if (subtitles.length > 0) fallbackObj.subtitles = subtitles;
                list.push(fallbackObj);
            }
        }
        return list;
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "kuudere_stream_subdub_type",
                multiSelectListPreference: {
                    title: "Preferred stream sub/dub type",
                    summary: "Choose the types of streams you want to see",
                    values: ["sub", "dub"],
                    entries: ["Sub", "Dub"],
                    entryValues: ["sub", "dub"],
                },
            },
            {
                key: "kuudere_stream_server",
                multiSelectListPreference: {
                    title: "Preferred server",
                    summary: "Choose the server/s you want to extract streams from",
                    values: ["Zen", "Zen-2"],
                    entries: ["Zen", "Zen-2"],
                    entryValues: ["Zen", "Zen-2"],
                },
            }
        ];
    }
}

