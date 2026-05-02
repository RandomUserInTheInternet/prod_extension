const fs = require('fs');
let src = fs.readFileSync('javascript/anime/src/en/anikototv.js', 'utf-8');

const newGetDetail = `    // \u2500\u2500 getDetail \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // url = slug like "naruto-shippuden-c8gov"
    async getDetail(url) {
        var slug = url;
        console.log("AniKoto getDetail: " + slug);

        var name = slug.replace(/-[a-z0-9]{5}$/, "").replace(/-/g, " ");
        var imageUrl = "";
        var description = "";
        var genre = [];
        var status = 5;
        var chapters = [];

        try {
            var ajaxHeaders = Object.assign({}, this.getHeaders(), { "X-Requested-With": "XMLHttpRequest" });

            // Fetch ep-1 page (always available, has data-id and full metadata)
            var ep1Url = this.baseUrl + "/watch/" + slug + "/ep-1";
            var ep1Res = await this.client.get(ep1Url, this.getHeaders());
            if (ep1Res.statusCode !== 200) {
                console.log("ep-1 page error: " + ep1Res.statusCode);
                chapters.push({ name: "Episode 1", url: slug + "||1||" });
                return { name, imageUrl, description, genre, status, chapters };
            }
            var html = ep1Res.body;

            // Title
            var titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                           || html.match(/<title>([^<]+)<\\/title>/i);
            if (titleMatch) {
                name = titleMatch[1]
                    .replace(/\\s*Episode\\s*\\d+.*$/i, "")
                    .replace(/\\s*-\\s*Anikoto.*$/i, "")
                    .replace(/^Anime\\s+/i, "")
                    .replace(/\\s*Watch Online Free\\s*$/i, "")
                    .trim();
            }

            // Image
            imageUrl = this.extractImage(html);

            // Description
            var descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
                          || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
            if (descMatch) description = descMatch[1].trim();

            // Genres
            var genreRegex = /href=["']\\/genre\\/([^"'\\/]+)["'][^>]*>([^<]+)</gi;
            var gm;
            var genreSet = new Set();
            while ((gm = genreRegex.exec(html)) !== null) {
                var g = gm[2].trim();
                if (g && !genreSet.has(g)) { genreSet.add(g); genre.push(g); }
            }

            // Status
            if (/finished.airing|completed/i.test(html)) status = 1;
            else if (/currently.airing|ongoing/i.test(html)) status = 0;
            else if (/not.yet.aired/i.test(html)) status = 2;

            // data-id for AJAX episode list
            var dataIdMatch = html.match(/data-id=["'](\\d+)["']/);
            if (dataIdMatch) {
                var animeId = dataIdMatch[1];
                var listRes = await this.client.get(this.baseUrl + "/ajax/episode/list/" + animeId, ajaxHeaders);
                if (listRes.statusCode === 200) {
                    var listData;
                    try { listData = JSON.parse(listRes.body).result; } catch(e) { listData = listRes.body; }
                    var epSeenNums = new Set();
                    var epItemRegex = /data-num=["'](\\d+)["'][^>]*data-ids=["']([^"']+)["']/gi;
                    var em;
                    while ((em = epItemRegex.exec(listData)) !== null) {
                        var epNum = parseInt(em[1], 10);
                        if (!epSeenNums.has(epNum)) {
                            epSeenNums.add(epNum);
                            chapters.push({ name: "Episode " + epNum, url: slug + "||" + epNum + "||" + em[2] });
                        }
                    }
                    if (chapters.length === 0) {
                        var epItemRegex2 = /data-ids=["']([^"']+)["'][^>]*data-num=["'](\\d+)["']/gi;
                        while ((em = epItemRegex2.exec(listData)) !== null) {
                            var epNum2 = parseInt(em[2], 10);
                            if (!epSeenNums.has(epNum2)) {
                                epSeenNums.add(epNum2);
                                chapters.push({ name: "Episode " + epNum2, url: slug + "||" + epNum2 + "||" + em[1] });
                            }
                        }
                    }
                }
            }

            if (chapters.length === 0) {
                chapters.push({ name: "Episode 1", url: slug + "||1||" });
            }

            chapters.sort(function(a, b) {
                return parseInt((a.url.split("||")[1] || "0"), 10) - parseInt((b.url.split("||")[1] || "0"), 10);
            });

            console.log("Detail: " + name + ", " + chapters.length + " eps");
        } catch(e) {
            console.log("getDetail error: " + e);
        }

        return { name, imageUrl, description, genre, status, chapters };
    }`;

// Find and replace the entire getDetail function
const startMarker = '    // \u2500\u2500 getDetail';
const endMarker = '    // \u2500\u2500 getVideoList';
const startIdx = src.indexOf(startMarker);
const endIdx = src.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) {
    console.error('Markers not found!', startIdx, endIdx);
    process.exit(1);
}
const patched = src.substring(0, startIdx) + newGetDetail + '\n\n    ' + src.substring(endIdx);
fs.writeFileSync('javascript/anime/src/en/anikototv.js', patched, 'utf-8');
console.log('Patched successfully. New size:', patched.length);
