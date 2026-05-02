const mangayomiSources = [{
    "name": "AniKoto",
    "lang": "en",
    "baseUrl": "https://anikototv.to",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=anikototv.to",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.3",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": true,
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/prod_extension/main/javascript/anime/src/en/anikototv.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 561837294,
    "notes": "AniKoto - Zoro platform. Providers: megaplay.buzz (Vidstream) & vidwish.live (VidCloud). AJAX chain: /ajax/episode/list -> /ajax/server/list -> /ajax/server -> embed URL + cid-signed sources API.",
    "pkgPath": "anime/src/en/anikototv.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.baseUrl = "https://anikototv.to";
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://anikototv.to/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        };
    }

    // ── Parse anime list cards ────────────────────────────────────────────────
    parseAnimeList(html) {
        var list = [];
        var seen = new Set();

        // Primary: <a href="/watch/{slug}"> <img src="{image}" alt="{title}">
        var cardRegex = /<a[^>]+href=["'](?:https?:\/\/[^\/]+)?\/watch\/([^"'\/\?]+)[^"']*["'][^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
        var m;
        while ((m = cardRegex.exec(html)) !== null) {
            var slug = m[1], imageUrl = m[2], title = m[3].trim();
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);
            list.push({ name: title, imageUrl: imageUrl, link: slug });
        }

        // Fallback: title attribute
        if (list.length === 0) {
            var titleRegex = /href=["'](?:https?:\/\/[^\/]+)?\/watch\/([^"'\/\?]+)(?:\/[^"'\?]*)?["'][^>]*title=["']([^"']+)["']/gi;
            while ((m = titleRegex.exec(html)) !== null) {
                var slug = m[1], title = m[2].trim();
                if (!slug || seen.has(slug)) continue;
                seen.add(slug);
                list.push({ name: title, imageUrl: "", link: slug });
            }
        }

        // Fallback: inner text
        if (list.length === 0) {
            var textRegex = /href=["'](?:https?:\/\/[^\/]+)?\/watch\/([^"'\/\?]+)(?:\/[^"'\?]*)?["'][^>]*>([^<]+)<\/a>/gi;
            while ((m = textRegex.exec(html)) !== null) {
                var slug = m[1], title = m[2].trim().replace(/\s+/g, " ");
                if (!slug || seen.has(slug) || title.length < 2 || title.includes("<")) continue;
                seen.add(slug);
                list.push({ name: title, imageUrl: "", link: slug });
            }
        }

        // Enrich images if missing
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (!item.imageUrl) {
                var imgM = html.match(new RegExp(item.link + "[\\s\\S]{0,300}?<img[^>]+(?:data-src|src)=[\"']([^\"']+)[\"']", "i"));
                if (imgM) { item.imageUrl = imgM[1]; continue; }
                var imgM2 = html.match(new RegExp("<img[^>]+(?:data-src|src)=[\"']([^\"']+)[\"'][\\s\\S]{0,300}?" + item.link, "i"));
                if (imgM2) item.imageUrl = imgM2[1];
            }
        }
        return list;
    }

    extractImage(html) {
        var m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (m) return m[1];
        m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (m) return m[1];
        m = html.match(/class=["'][^"']*(?:poster|cover|thumb)[^"']*["'][^>]*>\s*<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
        if (m) return m[1];
        return "";
    }

    async fetchListing(url) {
        try {
            var res = await this.client.get(url, this.getHeaders());
            if (res.statusCode !== 200) {
                console.log("Listing failed: " + res.statusCode);
                return { list: [], hasNextPage: false };
            }
            var html = res.body;
            var list = this.parseAnimeList(html);
            var hasNextPage = /href="[^"]*\?page=\d+[^"]*"/.test(html);
            var pageMatch = html.match(/\?page=(\d+)["']/g);
            if (pageMatch && pageMatch.length > 1) hasNextPage = true;
            return { list, hasNextPage };
        } catch(e) {
            console.log("fetchListing error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getPopular(page) {
        return await this.fetchListing(this.baseUrl + "/most-viewed" + (page > 1 ? "?page=" + page : ""));
    }

    async getLatestUpdates(page) {
        return await this.fetchListing(this.baseUrl + "/latest-updated" + (page > 1 ? "?page=" + page : ""));
    }

    async search(query, page, filters) {
        return await this.fetchListing(this.baseUrl + "/filter?keyword=" + encodeURIComponent(query) + (page > 1 ? "&page=" + page : ""));
    }

    // ── getDetail ─────────────────────────────────────────────────────────────
    // url = slug like "naruto-shippuden-c8gov"
    async getDetail(url) {
        var slug = url;
        var name = slug.replace(/-[a-z0-9]{5}$/, "").replace(/-/g, " ");
        var imageUrl = "", description = "", genre = [], status = 5, chapters = [];

        try {
            var ajaxHeaders = Object.assign({}, this.getHeaders(), { "X-Requested-With": "XMLHttpRequest" });

            var ep1Res = await this.client.get(this.baseUrl + "/watch/" + slug + "/ep-1", this.getHeaders());
            if (ep1Res.statusCode !== 200) {
                chapters.push({ name: "Episode 1", url: slug + "||1||" });
                return { name, imageUrl, description, genre, status, chapters };
            }
            var html = ep1Res.body;

            var titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                           || html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) {
                name = titleMatch[1]
                    .replace(/\s*Episode\s*\d+.*$/i, "")
                    .replace(/\s*-\s*Anikoto.*$/i, "")
                    .replace(/^Anime\s+/i, "")
                    .replace(/\s*Watch Online Free\s*$/i, "")
                    .trim();
            }

            imageUrl = this.extractImage(html);

            var descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
                          || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
            if (descMatch) description = descMatch[1].trim();

            var genreRegex = /href=["']\/genre\/([^"'\/]+)["'][^>]*>([^<]+)</gi;
            var gm, genreSet = new Set();
            while ((gm = genreRegex.exec(html)) !== null) {
                var g = gm[2].trim();
                if (g && !genreSet.has(g)) { genreSet.add(g); genre.push(g); }
            }

            if (/finished.airing|completed/i.test(html)) status = 1;
            else if (/currently.airing|ongoing/i.test(html)) status = 0;
            else if (/not.yet.aired/i.test(html)) status = 2;

            var dataIdMatch = html.match(/data-id=["'](\d+)["']/);
            if (dataIdMatch) {
                var animeId = dataIdMatch[1];
                var listRes = await this.client.get(this.baseUrl + "/ajax/episode/list/" + animeId, ajaxHeaders);
                if (listRes.statusCode === 200) {
                    var listData;
                    try { listData = JSON.parse(listRes.body).result; } catch(e) { listData = listRes.body; }
                    var epSeenNums = new Set();
                    var epItemRegex = /data-num=["'](\d+)["'][^>]*data-ids=["']([^"']+)["']/gi;
                    var em;
                    while ((em = epItemRegex.exec(listData)) !== null) {
                        var epNum = parseInt(em[1], 10);
                        if (!epSeenNums.has(epNum)) {
                            epSeenNums.add(epNum);
                            chapters.push({ name: "Episode " + epNum, url: slug + "||" + epNum + "||" + em[2] });
                        }
                    }
                    if (chapters.length === 0) {
                        var epItemRegex2 = /data-ids=["']([^"']+)["'][^>]*data-num=["'](\d+)["']/gi;
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

            console.log("AniKoto detail: " + name + ", " + chapters.length + " eps");
        } catch(e) {
            console.log("AniKoto getDetail error: " + e);
        }
        return { name, imageUrl, description, genre, status, chapters };
    }

    // ── getVideoList ──────────────────────────────────────────────────────────
    // url format: "{slug}||{epNum}||{dataIds}"
    //
    // Confirmed stream chain (verified via Scrapling + DevTools):
    //  1. /ajax/server/list?servers={dataIds} → li with data-link-id
    //  2. /ajax/server?get={linkId}           → { result: { url: "https://megaplay.buzz/stream/s-2/{id}/sub" } }
    //  3. Fetch embed page                    → data-id="{internal}", cid="{token}", cidu="{token2}"
    //  4. {host}/api/source/{internal}?cid={token} → JSON { sources:[{file:"...m3u8"}] }
    //     (cid is required; if missing we fall back to passing embed URL directly)
    async getVideoList(url) {
        var parts = url.split("||");
        var slug = parts[0];
        var epNum = parts[1] || "1";
        var cachedDataIds = parts[2] || "";

        console.log("AniKoto getVideoList ep" + epNum + ": " + slug);

        try {
            var headers = this.getHeaders();
            var ajaxHeaders = Object.assign({}, headers, { "X-Requested-With": "XMLHttpRequest" });
            var dataIds = cachedDataIds;

            // ── Step 0: Resolve dataIds if not cached ────────────────────────
            if (!dataIds) {
                var epUrl = this.baseUrl + "/watch/" + slug + "/ep-" + epNum;
                var res = await this.client.get(epUrl, headers);
                if (res.statusCode !== 200) { console.log("Episode page error: " + res.statusCode); return []; }
                var html = res.body;
                var dataIdMatch = html.match(/data-id=["'](\d+)["']/);
                if (!dataIdMatch) { console.log("No data-id found on episode page"); return []; }
                var animeId = dataIdMatch[1];

                var epListRes = await this.client.get(this.baseUrl + "/ajax/episode/list/" + animeId, ajaxHeaders);
                if (epListRes.statusCode !== 200) return [];
                var listData;
                try { listData = JSON.parse(epListRes.body).result; } catch(e) { listData = epListRes.body; }

                var epNumMatch = listData.match(new RegExp('data-num=["\']' + epNum + '["\'][^>]*data-ids=["\']([^"\']+)["\']', 'i'));
                if (!epNumMatch) epNumMatch = listData.match(new RegExp('data-ids=["\']([^"\']+)["\'][^>]*data-num=["\']' + epNum + '["\']', 'i'));
                if (!epNumMatch) { console.log("No data-ids for ep " + epNum); return []; }
                dataIds = epNumMatch[1];
            }

            // ── Step 1: Get server list ──────────────────────────────────────
            var serverListRes = await this.client.get(
                this.baseUrl + "/ajax/server/list?servers=" + encodeURIComponent(dataIds), ajaxHeaders);
            if (serverListRes.statusCode !== 200) { console.log("Server list failed: " + serverListRes.statusCode); return []; }

            var serverHtml;
            try { serverHtml = JSON.parse(serverListRes.body).result; } catch(e) { serverHtml = serverListRes.body; }

            var linkIdRegex = /data-link-id=["']([^"']+)["'][^>]*>([^<]+)<\/li>/gi;
            var lm, servers = [];
            while ((lm = linkIdRegex.exec(serverHtml)) !== null) {
                servers.push({ id: lm[1], name: lm[2].trim() });
            }
            console.log("AniKoto: " + servers.length + " servers found");

            var videos = [];

            for (var i = 0; i < servers.length; i++) {
                var s = servers[i];
                try {
                    // ── Step 2: Get embed URL ────────────────────────────────
                    var serverRes = await this.client.get(
                        this.baseUrl + "/ajax/server?get=" + s.id, ajaxHeaders);
                    if (serverRes.statusCode !== 200) continue;
                    var serverData = JSON.parse(serverRes.body);
                    if (!serverData.result || !serverData.result.url) continue;
                    var embedUrl = serverData.result.url;
                    console.log("AniKoto: " + s.name + " => " + embedUrl);

                    // ── Step 3: Fetch embed page for cid token ───────────────
                    var hostMatch = embedUrl.match(/^(https?:\/\/[^\/]+)/);
                    if (!hostMatch) {
                        videos.push({ url: embedUrl, originalUrl: embedUrl, quality: "Embed - " + s.name, headers: { "Referer": this.baseUrl + "/" } });
                        continue;
                    }
                    var hostBase = hostMatch[1];

                    var embedRes = await this.client.get(embedUrl, { "Referer": this.baseUrl + "/", "User-Agent": headers["User-Agent"] });
                    if (embedRes.statusCode !== 200 || !embedRes.body.includes("data-id=")) {
                        // Error page or wrong content — return embed URL as fallback
                        videos.push({ url: embedUrl, originalUrl: embedUrl, quality: "Embed - " + s.name, headers: { "Referer": this.baseUrl + "/" } });
                        continue;
                    }

                    var embedHtml = embedRes.body;
                    var internalIdM = embedHtml.match(/data-id=["'](\d+)["']/);
                    var cidM = embedHtml.match(/cid\s*:\s*'([^']+)'/i) || embedHtml.match(/cid\s*:\s*"([^"]+)"/i);
                    var ciduM = embedHtml.match(/cidu\s*:\s*'([^']+)'/i) || embedHtml.match(/cidu\s*:\s*"([^"]+)"/i);

                    var internalId = internalIdM ? internalIdM[1] : "";
                    var cid = cidM ? cidM[1] : "";
                    var cidu = ciduM ? ciduM[1] : "";

                    console.log("AniKoto embed: id=" + internalId + " cid=" + cid + " cidu=" + cidu);

                    // ── Step 4: Try sources API with cid token ───────────────
                    var srcAdded = false;
                    if (internalId && cid) {
                        var cidParam = "?cid=" + encodeURIComponent(cid) + (cidu ? "&cidu=" + encodeURIComponent(cidu) : "");
                        var srcUrls = [
                            hostBase + "/api/source/" + internalId + cidParam,
                            hostBase + "/api/v2/source/" + internalId + cidParam,
                            hostBase + "/getSources?id=" + internalId + "&cid=" + encodeURIComponent(cid),
                        ];
                        var srcHeaders = {
                            "Referer": hostBase + "/",
                            "X-Requested-With": "XMLHttpRequest",
                            "User-Agent": headers["User-Agent"]
                        };

                        for (var si = 0; si < srcUrls.length && !srcAdded; si++) {
                            try {
                                var srcRes = await this.client.get(srcUrls[si], srcHeaders);
                                if (srcRes.statusCode === 200) {
                                    var srcData = JSON.parse(srcRes.body);
                                    var srcList = srcData.sources || (srcData.file ? [srcData] : []);
                                    for (var sj = 0; sj < srcList.length; sj++) {
                                        var f = srcList[sj].file || srcList[sj].url || "";
                                        if (f && (f.includes(".m3u8") || f.includes(".mp4"))) {
                                            videos.push({
                                                url: f, originalUrl: f,
                                                quality: (srcList[sj].label || "Auto") + " - " + s.name,
                                                headers: { "Referer": hostBase + "/" }
                                            });
                                            srcAdded = true;
                                        }
                                    }
                                }
                            } catch(e2) { console.log("src API error: " + e2); }
                        }
                    }

                    // Fallback: return embed URL for Mangayomi to try as WebView
                    if (!srcAdded) {
                        console.log("AniKoto: sources API failed, falling back to embed URL");
                        videos.push({
                            url: embedUrl, originalUrl: embedUrl,
                            quality: "Embed - " + s.name,
                            headers: { "Referer": this.baseUrl + "/" }
                        });
                    }
                } catch (err) {
                    console.log("AniKoto server " + s.name + " error: " + err);
                }
            }

            console.log("AniKoto total videos: " + videos.length);
            return videos;
        } catch(e) {
            console.log("AniKoto getVideoList error: " + e);
            return [];
        }
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "stream_type",
                listPreference: {
                    title: "Stream Type",
                    summary: "Prefer subtitled or dubbed audio",
                    valueIndex: 0,
                    entries: ["Sub", "Dub"],
                    entryValues: ["sub", "dub"]
                }
            }
        ];
    }
}
