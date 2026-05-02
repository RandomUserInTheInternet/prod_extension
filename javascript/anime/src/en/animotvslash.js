const mangayomiSources = [{
    "name": "AnimoTVSlash",
    "lang": "en",
    "baseUrl": "https://animotvslash.org",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=animotvslash.org",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.4",
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
    "notes": "AnimoTVSlash - Anime streaming with direct m3u8 via jw-player",
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

    getPreference(key) {
        try {
            var preferences = new SharedPreferences();
            return preferences.get(key);
        } catch(e) {
            return null;
        }
    }

    // ── Decode base64 string (Mangayomi has no native atob) ─────────────────
    // BUG FIX: '=' padding is at index 64 in the charset — must skip c >= 64
    // otherwise padding bytes corrupt the output and JSON.parse fails.
    decodeBase64(b64) {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var output = "";
        var buffer = 0, bufLen = 0;
        for (var i = 0; i < b64.length; i++) {
            var c = chars.indexOf(b64.charAt(i));
            if (c < 0) continue; // -1 = unknown char, skip; '=' is not in chars so also skipped
            buffer = (buffer << 6) | c;
            bufLen += 6;
            if (bufLen >= 8) {
                bufLen -= 8;
                output += String.fromCharCode((buffer >> bufLen) & 0xFF);
            }
        }
        return output;
    }

    // ── Parse article.bs grid cards from listing/search HTML ─────────────────
    // Cards link to episode pages (/{slug}-episode-{N}/).
    // We strip -episode-{N} to get the anime slug, then store /anime/{slug}/
    parseAnimeList(html) {
        var list = [];
        var seen = new Set();

        // Match each <article class="bs ..."> block
        var articleRx = /<article[^>]+class="[^"]*\bbs\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
        var am;
        while ((am = articleRx.exec(html)) !== null) {
            var inner = am[1];

            // Href points to episode page: /{anime-slug}-episode-{N}/
            var hrefM = inner.match(/href=['"](https?:\/\/animotvslash\.org\/([^'"\/]+)-episode-\d+[^'"]*?)['"]/i);
            if (!hrefM) continue;
            var slug = hrefM[2];
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);

            // Image — try src, data-src, data-lazy-src
            var imgM = inner.match(/<img[^>]+(?:src|data-src|data-lazy-src)=['"](https?:\/\/[^'"]+)['"]/i);
            var imageUrl = imgM ? imgM[1] : "";

            // Title — from <div class="tt"> or alt attribute
            var ttM = inner.match(/class=["'][^"']*\btt\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|h2|h3)>/i);
            var name = "";
            if (ttM) {
                // Strip inner tags
                name = ttM[1].replace(/<[^>]+>/g, "").trim();
            }
            if (!name) {
                // Fall back to alt minus " Episode N" suffix
                var altM = inner.match(/alt=['"](.*?)(?:\s+Episode\s+\d+)?\s*['"]/i);
                if (altM) name = altM[1].trim();
            }
            if (!name) continue;

            list.push({
                name: name,
                imageUrl: imageUrl,
                link: "/anime/" + slug + "/"
            });
        }
        return list;
    }

    async fetchListing(url) {
        try {
            var res = await this.client.get(url, this.getHeaders());
            if (res.statusCode !== 200) return { list: [], hasNextPage: false };
            var list = this.parseAnimeList(res.body);
            // Pagination: WordPress uses /page/{N}/ structure
            var hasNextPage = /href=['"](https?:\/\/animotvslash\.org\/page\/\d+\/)['"]/i.test(res.body);
            return { list, hasNextPage };
        } catch(e) {
            console.log("fetchListing error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getPopular(page) {
        var url = this.baseUrl + (page > 1 ? "/page/" + page + "/" : "/");
        return await this.fetchListing(url);
    }

    async getLatestUpdates(page) {
        var url = this.baseUrl + (page > 1 ? "/page/" + page + "/" : "/");
        return await this.fetchListing(url);
    }

    async search(query, page, filters) {
        // WordPress standard search: /?s={query}
        var url = this.baseUrl + "/?s=" + encodeURIComponent(query) +
                  (page > 1 ? "&paged=" + page : "");
        return await this.fetchListing(url);
    }

    // ── getDetail ─────────────────────────────────────────────────────────────
    // url = "/anime/{slug}/" as stored by parseAnimeList
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

            // Image
            var img = html.match(/meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            if (img) imageUrl = img[1];

            // Description
            var desc = html.match(/meta[^>]+(?:property=["']og:description["']|name=["']description["'])[^>]+content=["']([^"']+)["']/i);
            if (desc) description = desc[1].trim();

            // Genres (links containing /genre/)
            var gm, genreRx = /href=["'][^"']*\/genre\/[^"'\/]+[^"']*["'][^>]*>([^<]+)</gi;
            while ((gm = genreRx.exec(html)) !== null) {
                var g = gm[1].trim();
                if (g && !genre.includes(g)) genre.push(g);
            }

            // Status
            if (/completed|finished/i.test(html)) status = 1;
            else if (/ongoing|airing/i.test(html)) status = 0;

            // ── Episode list from .eplister ul li a ───────────────────────────
            // BUG FIX: The old regex /<div...eplister...>(.*?)<\/div>/ stopped
            // at the FIRST closing </div> (the ephead div), never reaching <ul>.
            // Fix: slice from the eplister class position to end of HTML instead.
            var eplistIdx = html.indexOf('class="eplister"');
            if (eplistIdx === -1) eplistIdx = html.indexOf("class='eplister'");
            var epBlock = eplistIdx !== -1 ? html.slice(eplistIdx) : html;

            // Extract anime slug from detailUrl to filter only relevant episodes
            var animeSlugM = detailUrl.match(/\/anime\/([^\/]+)\/?$/);
            var animeSlug  = animeSlugM ? animeSlugM[1] : "";

            var epRx = /href=["'](https?:\/\/animotvslash\.org\/(([^"'\/]+-episode-(\d+))[^"'\/]*)\/?)["|']/gi;
            var em, seen = new Set();
            while ((em = epRx.exec(epBlock)) !== null) {
                var epHref    = em[1];
                var epFullSlug = em[2]; // e.g. that-time-...-episode-4
                var epNum     = parseInt(em[4], 10);
                if (isNaN(epNum) || seen.has(epNum)) continue;
                // Filter: only keep episodes belonging to this anime
                if (animeSlug && !epFullSlug.startsWith(animeSlug + "-episode-")) continue;
                seen.add(epNum);
                chapters.push({ name: "Episode " + epNum, url: epHref });
            }

            // Sort ascending
            chapters.sort((a, b) => {
                var na = parseInt((a.url.match(/-episode-(\d+)/) || [0, 0])[1]);
                var nb = parseInt((b.url.match(/-episode-(\d+)/) || [0, 0])[1]);
                return na - nb;
            });

            if (chapters.length === 0) {
                // Absolute fallback — try episode 1
                var slugM = detailUrl.match(/\/anime\/([^\/]+)\//);
                if (slugM) {
                    chapters.push({
                        name: "Episode 1",
                        url: this.baseUrl + "/" + slugM[1] + "-episode-1/"
                    });
                }
            }

        } catch(e) { console.log("getDetail error: " + e); }

        return { name, imageUrl, description, genre, status, chapters };
    }


    // ── getVideoList ──────────────────────────────────────────────────────────
    async getVideoList(url) {
        var videos = [];
        
        var prefDubType = this.getPreference("animotvslash_stream_subdub_type");
        if (!prefDubType || prefDubType.length === 0) prefDubType = ["sub", "softsub", "dub"];
        
        var prefServer = this.getPreference("animotvslash_stream_server");
        if (!prefServer || prefServer.length === 0) prefServer = ["animo-m", "animo", "wish", "moon", "hydrax"];

        try {
            var epUrl = url.startsWith("http") ? url : this.baseUrl + url;
            var res = await this.client.get(epUrl, this.getHeaders());
            var html = res.body;

            var selectM = html.match(/<select class=["']mirror["'][\s\S]*?<\/select>/i);
            if (!selectM) {
                console.log("AnimoTVSlash: mirror select not found");
                return videos;
            }

            var optionRx = /<option value=["']([^"']+)["'][^>]*>\s*([^<]+)\s*<\/option>/gi;
            var om;
            while ((om = optionRx.exec(selectM[0])) !== null) {
                var base64Val = om[1];
                var rawLabel = om[2].trim();
                if (rawLabel.toLowerCase().includes("select")) continue;
                
                var typeMatch = rawLabel.match(/(Sub|SoftSub|Dub)/i);
                var dataType = typeMatch ? typeMatch[1].toLowerCase() : "sub";
                var serverName = rawLabel.replace(/(Sub|SoftSub|Dub)\s*-\s*/i, "").trim().toLowerCase();
                
                if (!prefDubType.includes(dataType)) continue;
                if (!prefServer.includes(serverName)) continue;
                
                var decodedHtml = this.decodeBase64(base64Val);
                var iframeM = decodedHtml.match(/src=["']([^"']+)["']/i);
                if (!iframeM) continue;
                
                var streamUrl = iframeM[1];
                var displayLabel = serverName.toUpperCase() + " (" + dataType + ")";
                
                // If it's a jw-player Rumble stream
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
                                    var qualityMap = { "1920x1080": "1080p", "1280x720": "720p", "854x480": "480p", "640x360": "360p" };
                                    var pushedRumble = false;
                                    
                                    for (var i = 0; i < lines.length; i++) {
                                        var line = lines[i].trim();
                                        if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
                                        var resM = line.match(/RESOLUTION=([\dx]+)/i);
                                        var quality = resM ? (qualityMap[resM[1]] || resM[1]) : "Default";
                                        
                                        var sUrl = "";
                                        for (var j = i + 1; j < lines.length; j++) {
                                            var nL = lines[j].trim();
                                            if (nL && !nL.startsWith("#")) { sUrl = nL; break; }
                                        }
                                        if (!sUrl) continue;
                                        
                                        if (sUrl.startsWith("//")) sUrl = "https:" + sUrl;
                                        if (!sUrl.startsWith("http")) {
                                            var rumbleBase = masterUrl.slice(0, masterUrl.lastIndexOf("/") + 1);
                                            sUrl = rumbleBase + sUrl;
                                        }
                                        
                                        videos.push({
                                            url: sUrl,
                                            originalUrl: sUrl,
                                            quality: displayLabel + " - " + quality,
                                            headers: { "Referer": this.baseUrl + "/" }
                                        });
                                        pushedRumble = true;
                                    }
                                    
                                    if (pushedRumble) continue;
                                }
                            }
                        } catch(e) {}
                    }
                }
                
                // Fallback for non-Rumble or failed Rumble
                videos.push({
                    url: streamUrl,
                    originalUrl: streamUrl,
                    quality: displayLabel,
                    headers: { "Referer": this.baseUrl + "/" }
                });
            }

        } catch(e) { console.log("AnimoTVSlash: getVideoList error: " + e); }

        return videos;
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() {
        return [
            {
                "key": "animotvslash_stream_subdub_type",
                "listPreference": {
                    "title": "Preferred stream sub/dub type",
                    "summary": "Select your preferred stream sub/dub type",
                    "valueIndex": 0,
                    "entries": ["Sub", "SoftSub", "Dub"],
                    "entryValues": ["sub", "softsub", "dub"]
                }
            },
            {
                "key": "animotvslash_stream_server",
                "listPreference": {
                    "title": "Preferred server",
                    "summary": "Select your preferred servers",
                    "valueIndex": 0,
                    "entries": ["ANIMO-M", "Animo", "Wish", "Moon", "Hydrax"],
                    "entryValues": ["animo-m", "animo", "wish", "moon", "hydrax"]
                }
            }
        ];
    }
}
