const mangayomiSources = [{
    "name": "AniKoto",
    "lang": "en",
    "baseUrl": "https://anikototv.to",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=anikototv.to",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.2",
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
    "notes": "AniKoto anime streaming - HTML scraping, embed player via iframe",
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

    // ── Parse anime list cards from filter/listing pages ─────────────────────
    // Each card in the page is a link like:
    //   <a href="/watch/{slug}/ep-{N}">Title</a>  (listing pages with ep badge)
    //   <a href="/watch/{slug}">Title</a>          (detail page related)
    // We extract slug from /watch/{slug}[/ep-N] links.
    parseAnimeList(html) {
        var list = [];
        var seen = new Set();

        // 1. Robust card regex: matches <a href=".../watch/{slug}"> <img src="{image}" alt="{title}" />
        var cardRegex = /<a[^>]+href=["'](?:https?:\/\/[^\/]+)?\/watch\/([^"'\/\?]+)[^"']*["'][^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
        var m;
        while ((m = cardRegex.exec(html)) !== null) {
            var slug = m[1];
            var imageUrl = m[2];
            var title = m[3].trim();
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);
            list.push({ name: title, imageUrl: imageUrl, link: slug });
        }

        // 2. Fallback: Try to match <a> tags with title attribute
        if (list.length === 0) {
            var titleRegex = /href=["'](?:https?:\/\/[^\/]+)?\/watch\/([^"'\/\?]+)(?:\/[^"'\?]*)?["'][^>]*title=["']([^"']+)["']/gi;
            while ((m = titleRegex.exec(html)) !== null) {
                var slug = m[1];
                var title = m[2].trim();
                if (!slug || seen.has(slug)) continue;
                seen.add(slug);
                list.push({ name: title, imageUrl: "", link: slug });
            }
        }

        // 3. Fallback: match <a> tags and their inner text
        if (list.length === 0) {
            var textRegex = /href=["'](?:https?:\/\/[^\/]+)?\/watch\/([^"'\/\?]+)(?:\/[^"'\?]*)?["'][^>]*>([^<]+)<\/a>/gi;
            while ((m = textRegex.exec(html)) !== null) {
                var slug = m[1];
                var title = m[2].trim().replace(/\s+/g, " ");
                if (!slug || seen.has(slug) || title.length < 2 || title.includes("<")) continue;
                seen.add(slug);
                list.push({ name: title, imageUrl: "", link: slug });
            }
        }

        // Try to enrich with images if missing
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (!item.imageUrl) {
                var imgBlockRegex = new RegExp(item.link + "[\\s\\S]{0,300}?<img[^>]+(?:data-src|src)=[\"']([^\"']+)[\"']", "i");
                var imgMatch = html.match(imgBlockRegex);
                if (imgMatch) {
                    item.imageUrl = imgMatch[1];
                } else {
                    var imgBlockRev = new RegExp("<img[^>]+(?:data-src|src)=[\"']([^\"']+)[\"'][\\s\\S]{0,300}?" + item.link, "i");
                    var revMatch = html.match(imgBlockRev);
                    if (revMatch) item.imageUrl = revMatch[1];
                }
            }
        }

        return list;
    }

    // ── Extract image from anime detail page ──────────────────────────────────
    extractImage(html) {
        // Try og:image first
        var m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (m) return m[1];
        m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (m) return m[1];
        // Try poster/cover img with data-src
        m = html.match(/class=["'][^"']*(?:poster|cover|thumb)[^"']*["'][^>]*>\s*<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
        if (m) return m[1];
        return "";
    }

    // ── Fetch and parse a page listing (popular/latest/search) ───────────────
    async fetchListing(url) {
        try {
            var res = await this.client.get(url, this.getHeaders());
            if (res.statusCode !== 200) {
                console.log("Listing fetch failed: " + res.statusCode + " for " + url);
                return { list: [], hasNextPage: false };
            }
            var html = res.body;
            var list = this.parseAnimeList(html);

            // Check pagination: look for next page link
            var hasNextPage = /href="[^"]*\?page=\d+[^"]*"/.test(html);
            // More reliable: check if current page indicator exists and isn't the last
            var pageMatch = html.match(/\?page=(\d+)["']/g);
            // If there are page links present, assume hasNextPage conservatively
            if (pageMatch && pageMatch.length > 1) hasNextPage = true;

            console.log("Listing " + url + ": " + list.length + " items, hasNext=" + hasNextPage);
            return { list, hasNextPage };
        } catch(e) {
            console.log("fetchListing error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getPopular(page) {
        var url = this.baseUrl + "/most-viewed" + (page > 1 ? "?page=" + page : "");
        return await this.fetchListing(url);
    }

    async getLatestUpdates(page) {
        var url = this.baseUrl + "/latest-updated" + (page > 1 ? "?page=" + page : "");
        return await this.fetchListing(url);
    }

    async search(query, page, filters) {
        var url = this.baseUrl + "/filter?keyword=" + encodeURIComponent(query) + (page > 1 ? "&page=" + page : "");
        return await this.fetchListing(url);
    }

    // ── getDetail ─────────────────────────────────────────────────────────────
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
                           || html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) {
                name = titleMatch[1]
                    .replace(/\s*Episode\s*\d+.*$/i, "")
                    .replace(/\s*-\s*Anikoto.*$/i, "")
                    .replace(/^Anime\s+/i, "")
                    .replace(/\s*Watch Online Free\s*$/i, "")
                    .trim();
            }

            // Image
            imageUrl = this.extractImage(html);

            // Description
            var descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
                          || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
            if (descMatch) description = descMatch[1].trim();

            // Genres
            var genreRegex = /href=["']\/genre\/([^"'\/]+)["'][^>]*>([^<]+)</gi;
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

            console.log("Detail: " + name + ", " + chapters.length + " eps");
        } catch(e) {
            console.log("getDetail error: " + e);
        }

        return { name, imageUrl, description, genre, status, chapters };
    }

        // ── getVideoList ──────────────────────────────────────────────────────────
    // url format: "{slug}||{epNum}||{dataIds}"
    async getVideoList(url) {
        var parts = url.split("||");
        var slug = parts[0];
        var epNum = parts[1] || "1";
        // parts[2] is the pre-cached dataIds from getDetail
        var cachedDataIds = parts[2] || "";
        var epUrl = this.baseUrl + "/watch/" + slug + "/ep-" + epNum;

        console.log("AniKoto getVideoList: " + epUrl);

        try {
            var headers = this.getHeaders();
            var ajaxHeaders = Object.assign({}, headers, { "X-Requested-With": "XMLHttpRequest" });

            var dataIds = cachedDataIds;

            // If we don't have cached dataIds, fetch from episode page + AJAX
            if (!dataIds) {
                var res = await this.client.get(epUrl, headers);
                if (res.statusCode !== 200) {
                    console.log("Episode page error: " + res.statusCode);
                    return [];
                }
                var html = res.body;

                var dataIdMatch = html.match(/data-id=["'](\d+)["']/);
                if (!dataIdMatch) {
                    console.log("No data-id found");
                    return [];
                }
                var animeId = dataIdMatch[1];

                var epListRes = await this.client.get(this.baseUrl + "/ajax/episode/list/" + animeId, ajaxHeaders);
                if (epListRes.statusCode !== 200) return [];

                var listData;
                try { listData = JSON.parse(epListRes.body).result; } catch(e) { listData = epListRes.body; }

                // Match by data-num
                var epNumMatch = listData.match(new RegExp('data-num=["\']' + epNum + '["\'][^>]*data-ids=["\']([^"\']+)["\']', 'i'));
                if (!epNumMatch) {
                    epNumMatch = listData.match(new RegExp('data-ids=["\']([^"\']+)["\'][^>]*data-num=["\']' + epNum + '["\']', 'i'));
                    if (epNumMatch) dataIds = epNumMatch[1];
                } else {
                    dataIds = epNumMatch[1];
                }

                if (!dataIds) {
                    console.log("Could not find data-ids for ep " + epNum);
                    return [];
                }
            }

            // Fetch server list for this episode's dataIds
            var serverListRes = await this.client.get(this.baseUrl + "/ajax/server/list?servers=" + encodeURIComponent(dataIds), ajaxHeaders);
            if (serverListRes.statusCode !== 200) return [];

            var serverHtml;
            try { serverHtml = JSON.parse(serverListRes.body).result; } catch(e) { serverHtml = serverListRes.body; }

            var linkIdRegex = /data-link-id=["']([^"']+)["'][^>]*>([^<]+)<\/li>/gi;
            var lm;
            var servers = [];
            while ((lm = linkIdRegex.exec(serverHtml)) !== null) {
                servers.push({ id: lm[1], name: lm[2].trim() });
            }

            var videos = [];

            for (var i = 0; i < servers.length; i++) {
                var s = servers[i];
                try {
                    var serverRes = await this.client.get(this.baseUrl + "/ajax/server?get=" + s.id, ajaxHeaders);
                    if (serverRes.statusCode === 200) {
                        var data = JSON.parse(serverRes.body);
                        if (data.result && data.result.url) {
                            var embedUrl = data.result.url;
                            videos.push({
                                url: embedUrl,
                                originalUrl: embedUrl,
                                quality: "Embed - " + s.name,
                                headers: { "Referer": this.baseUrl + "/" }
                            });
                        }
                    }
                } catch (err) {
                    console.log("Server err " + s.name + ": " + err);
                }
            }

            console.log("Videos found: " + videos.length);
            return videos;
        } catch(e) {
            console.log("getVideoList error: " + e);
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
