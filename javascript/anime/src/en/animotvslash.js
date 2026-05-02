const mangayomiSources = [{
    "name": "AnimoTVSlash [Buggy]",
    "lang": "en",
    "baseUrl": "https://animotvslash.org",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=animotvslash.org",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.7",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/prod_extension/main/javascript/anime/src/en/animotvslash.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 619273840,
    "notes": "AnimoTVSlash - ANIMO-M server only. Episodes returned descending for Nuord app compatibility.",
    "pkgPath": "anime/src/en/animotvslash.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.baseUrl = "https://animotvslash.org";
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": this.baseUrl + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    // ── Base64 decoder (Mangayomi has no native atob) ─────────────────────────
    decodeBase64(b64) {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var output = "";
        var buffer = 0, bufLen = 0;
        for (var i = 0; i < b64.length; i++) {
            var c = chars.indexOf(b64.charAt(i));
            if (c < 0) continue; // skip padding '=' and unknown chars
            buffer = (buffer << 6) | c;
            bufLen += 6;
            if (bufLen >= 8) {
                bufLen -= 8;
                output += String.fromCharCode((buffer >> bufLen) & 0xFF);
            }
        }
        return output;
    }

    // ── Parse anime grid cards from listing or search HTML ────────────────────
    // Homepage: cards use episode-page hrefs  /{slug}-episode-{N}/
    // Search:   cards use direct anime hrefs  /anime/{slug}/
    // Both patterns are handled.
    parseAnimeList(html) {
        var list = [];
        var seen = new Set();

        var articleRx = /<article[^>]+class="[^"]*\bbs\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
        var am;
        while ((am = articleRx.exec(html)) !== null) {
            var inner = am[1];
            var slug = "";

            // Pattern 1: /{slug}-episode-{N}/
            var epM = inner.match(/href=['"]https?:\/\/animotvslash\.org\/([^'"\/]+?)-episode-\d+[^'"]*?['"]/i);
            if (epM) { slug = epM[1]; }

            // Pattern 2: /anime/{slug}/  (search results page)
            if (!slug) {
                var animeM = inner.match(/href=['"]https?:\/\/animotvslash\.org\/anime\/([^'"\/]+)\/['"]/i);
                if (animeM) { slug = animeM[1]; }
            }

            if (!slug || seen.has(slug)) continue;
            seen.add(slug);

            // Image — try src, data-src, data-lazy-src; ensure absolute URL
            var imgM2 = inner.match(/<img[^>]+(?:src|data-src|data-lazy-src)=['"]([^'"]+)['"]/i);
            var imageUrl = imgM2 ? imgM2[1].trim() : "";
            if (imageUrl && !imageUrl.startsWith("http")) imageUrl = "";

            // Title — prefer .tt div, fall back to img alt
            var ttM = inner.match(/class=["'][^"']*\btt\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|h2|h3)>/i);
            var name = "";
            if (ttM) { name = ttM[1].replace(/<[^>]+>/g, "").trim(); }
            if (!name) {
                var altM = inner.match(/alt=['"]([^'"]+?)(?:\s+Episode\s+\d+)?\s*['"]/i);
                if (altM) name = altM[1].trim();
            }
            if (!name) continue;

            list.push({ name, imageUrl, link: "/anime/" + slug + "/" });
        }
        return list;
    }

    async fetchListing(url) {
        try {
            var res = await this.client.get(url, this.getHeaders());
            if (res.statusCode !== 200) return { list: [], hasNextPage: false };
            var list = this.parseAnimeList(res.body);
            var hasNextPage = /href=['"]https?:\/\/animotvslash\.org\/page\/\d+\/['"]/i.test(res.body);
            return { list, hasNextPage };
        } catch(e) {
            console.log("AnimoTVSlash fetchListing error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getPopular(page) {
        return await this.fetchListing(this.baseUrl + (page > 1 ? "/page/" + page + "/" : "/"));
    }

    async getLatestUpdates(page) {
        return await this.fetchListing(this.baseUrl + (page > 1 ? "/page/" + page + "/" : "/"));
    }

    async search(query, page, filters) {
        var url = this.baseUrl + "/?s=" + encodeURIComponent(query) + (page > 1 ? "&paged=" + page : "");
        return await this.fetchListing(url);
    }

    // ── getDetail ──────────────────────────────────────────────────────────────
    // CRITICAL: Episodes are returned DESCENDING (newest first).
    // The Nuord WatchScreen does .reversed.toList() on the result, which produces
    // ascending order with Episode 1 at index 0. This aligns Anify metadata correctly.
    async getDetail(url) {
        var detailUrl = url.startsWith("http") ? url
                      : url.startsWith("/")    ? this.baseUrl + url
                      : this.baseUrl + "/anime/" + url + "/";

        var name = "", imageUrl = "", description = "", genre = [], status = 5, chapters = [];

        try {
            var res = await this.client.get(detailUrl, this.getHeaders());
            var html = res.body;

            // Title
            var t = html.match(/meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
            if (t) name = t[1].replace(/\s*[-|].*?(ANIMOTVSLASH|animotvslash)[^\n]*/i, "").trim();

            // Cover image
            var img = html.match(/meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            if (img) imageUrl = img[1];

            // Description
            var desc = html.match(/meta[^>]+(?:property=["']og:description["']|name=["']description["'])[^>]+content=["']([^"']+)["']/i);
            if (desc) description = desc[1].trim();

            // Genres
            var gm, genreRx = /href=["'][^"']*\/genre\/[^"'\/]+[^"']*["'][^>]*>([^<]+)</gi;
            while ((gm = genreRx.exec(html)) !== null) {
                var g = gm[1].trim();
                if (g && !genre.includes(g)) genre.push(g);
            }

            // Status
            if (/completed|finished/i.test(html)) status = 1;
            else if (/ongoing|airing/i.test(html)) status = 0;

            // Extract anime slug to filter only this anime's episodes
            var animeSlugM = detailUrl.match(/\/anime\/([^\/]+)\/?$/);
            var animeSlug  = animeSlugM ? animeSlugM[1] : "";

            // Slice from eplister block to avoid matching recommended/trending cards
            var eplistIdx = html.indexOf('class="eplister"');
            if (eplistIdx === -1) eplistIdx = html.indexOf("class='eplister'");
            var epBlock = eplistIdx !== -1 ? html.slice(eplistIdx) : html;

            // Extract all episode hrefs
            var epRx = /href=["'](https?:\/\/animotvslash\.org\/(([^"'\/]+-episode-(\d+))[^"'\/]*)\/?)["|']/gi;
            var em, seen = new Set();
            while ((em = epRx.exec(epBlock)) !== null) {
                var epHref     = em[1];
                var epFullSlug = em[2];
                var epNum      = parseInt(em[4], 10);
                if (isNaN(epNum) || seen.has(epNum)) continue;
                // Only keep episodes belonging to this anime
                if (animeSlug && !epFullSlug.startsWith(animeSlug + "-episode-")) continue;
                seen.add(epNum);
                chapters.push({ name: "Episode " + epNum, url: epHref });
            }

            // ── Sort DESCENDING (ep5, ep4, ep3, ep2, ep1) ────────────────────
            // The Nuord app calls .reversed.toList() on the episodes array.
            // Returning descending here means after reversal:
            //   index 0 = Episode 1  ← correct for Anify metadata alignment
            //   index 1 = Episode 2
            //   ...etc
            chapters.sort((a, b) => {
                var na = parseInt((a.url.match(/-episode-(\d+)/) || [0, 0])[1]);
                var nb = parseInt((b.url.match(/-episode-(\d+)/) || [0, 0])[1]);
                return nb - na; // descending
            });

            // Fallback: if eplister is empty, guess Episode 1 URL
            if (chapters.length === 0) {
                var slugM = detailUrl.match(/\/anime\/([^\/]+)\//);
                if (slugM) {
                    chapters.push({ name: "Episode 1", url: this.baseUrl + "/" + slugM[1] + "-episode-1/" });
                }
            }

        } catch(e) { console.log("AnimoTVSlash getDetail error: " + e); }

        return { name, imageUrl, description, genre, status, chapters };
    }

    // ── getVideoList ───────────────────────────────────────────────────────────
    // ANIMO-M server only. Supports jw-player/Rumble HLS + direct iframe fallback.
    async getVideoList(url) {
        var videos = [];
        try {
            var epUrl = url.startsWith("http") ? url : this.baseUrl + url;
            var res = await this.client.get(epUrl, this.getHeaders());
            var html = res.body;

            // Find the mirror <select>
            var selectM = html.match(/<select class=["']mirror["'][\s\S]*?<\/select>/i);
            if (!selectM) {
                console.log("AnimoTVSlash: mirror select not found");
                return videos;
            }

            var optionRx = /<option value=["']([^"']+)["'][^>]*>\s*([^<]+)\s*<\/option>/gi;
            var om;
            while ((om = optionRx.exec(selectM[0])) !== null) {
                var rawLabel = om[2].trim();
                if (rawLabel.toLowerCase().includes("select")) continue;

                // Only process ANIMO-M server
                var serverName = rawLabel.replace(/(Sub|SoftSub|Dub)\s*-\s*/i, "").trim().toLowerCase();
                if (serverName !== "animo-m") continue;

                var typeMatch = rawLabel.match(/(Sub|SoftSub|Dub)/i);
                var dataType = typeMatch ? typeMatch[1] : "Sub";
                var quality = "ANIMO-M (" + dataType + ")";

                // Decode the base64 option value → iframe HTML
                var decodedHtml = this.decodeBase64(om[1]);
                var iframeM = decodedHtml.match(/src=["']([^"']+)["']/i);
                if (!iframeM) continue;

                var streamUrl = iframeM[1];

                // jw-player / Rumble HLS extraction
                if (streamUrl.includes("/jw-player/")) {
                    var jwIdM = streamUrl.match(/\/jw-player\/([A-Za-z0-9+\/=]+)/);
                    if (jwIdM) {
                        var jwDecoded = this.decodeBase64(jwIdM[1]);
                        try {
                            var jwData = JSON.parse(jwDecoded);
                            var masterUrl = jwData.url || "";
                            if (masterUrl.startsWith("//")) masterUrl = "https:" + masterUrl;

                            if (masterUrl) {
                                var rumbleHeaders = {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                    "Referer": this.baseUrl + "/",
                                    "Origin": this.baseUrl
                                };
                                var masterRes = await this.client.get(masterUrl, rumbleHeaders);
                                if (masterRes.statusCode === 200) {
                                    var lines = masterRes.body.split("\n");
                                    var qualityMap = {
                                        "1920x1080": "1080p", "1280x720": "720p",
                                        "854x480": "480p", "640x360": "360p"
                                    };
                                    var pushedRumble = false;
                                    for (var i = 0; i < lines.length; i++) {
                                        var line = lines[i].trim();
                                        if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
                                        var resM = line.match(/RESOLUTION=([\dx]+)/i);
                                        var q = resM ? (qualityMap[resM[1]] || resM[1]) : "Default";
                                        var sUrl = "";
                                        for (var j = i + 1; j < lines.length; j++) {
                                            var nL = lines[j].trim();
                                            if (nL && !nL.startsWith("#")) { sUrl = nL; break; }
                                        }
                                        if (!sUrl) continue;
                                        if (sUrl.startsWith("//")) sUrl = "https:" + sUrl;
                                        if (!sUrl.startsWith("http")) {
                                            var base = masterUrl.slice(0, masterUrl.lastIndexOf("/") + 1);
                                            sUrl = base + sUrl;
                                        }
                                        videos.push({
                                            url: sUrl,
                                            originalUrl: sUrl,
                                            quality: quality + " - " + q,
                                            headers: { "Referer": this.baseUrl + "/" }
                                        });
                                        pushedRumble = true;
                                    }
                                    if (pushedRumble) continue; // skip fallback
                                }
                            }
                        } catch(e) {
                            console.log("AnimoTVSlash: jw-player parse error: " + e);
                        }
                    }
                }

                // Fallback: push iframe URL directly (non-Rumble or failed HLS)
                videos.push({
                    url: streamUrl,
                    originalUrl: streamUrl,
                    quality: quality,
                    headers: { "Referer": this.baseUrl + "/" }
                });
            }

        } catch(e) { console.log("AnimoTVSlash getVideoList error: " + e); }

        return videos;
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
