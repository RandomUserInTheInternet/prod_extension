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
        var pageUrl = this.baseUrl + "/watch/" + slug;
        console.log("AniKoto getDetail: " + pageUrl);

        var name = "";
        var imageUrl = "";
        var description = "";
        var genre = [];
        var status = 5;
        var chapters = [];

        try {
            var res = await this.client.get(pageUrl, this.getHeaders());
            if (res.statusCode !== 200) {
                console.log("Detail page error: " + res.statusCode);
                return { name: slug, imageUrl: "", description: "", genre: [], status: 5, chapters: [] };
            }
            var html = res.body;

            // Title — og:title
            var titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                           || html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) {
                name = titleMatch[1]
                    .replace(/\s*-\s*Anikoto.*$/i, "")
                    .replace(/^Anime\s+/i, "")
                    .replace(/\s*Watch Online Free\s*$/i, "")
                    .trim();
            }
            if (!name) name = slug.replace(/-[a-z0-9]{5}$/, "").replace(/-/g, " ");

            // Image
            imageUrl = this.extractImage(html);

            // Description — og:description
            var descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
                          || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
            if (descMatch) description = descMatch[1].trim();

            // Genres — links to /genre/
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

            // Episodes — find all /watch/{slug}/ep-{N} links
            var epRegex = /href=["']\/watch\/(([a-z0-9][a-z0-9\-]*[a-z0-9])\/ep-(\d+))["']/gi;
            var epSeen = new Set();
            var em;
            while ((em = epRegex.exec(html)) !== null) {
                var epNum = parseInt(em[3], 10);
                var epSlug = em[2]; // the base slug
                var key = epSlug + "||" + epNum;
                if (!epSeen.has(key)) {
                    epSeen.add(key);
                    chapters.push({
                        name: "Episode " + epNum,
                        url: epSlug + "||" + epNum
                    });
                }
            }

            // If no episodes found from links, try fetching via episode count heuristic
            if (chapters.length === 0) {
                // Check ep count from page text like "500 Eps" or "1159 Eps"
                var epCountMatch = html.match(/(\d+)\s*(?:Eps|Episodes)/i);
                var epCount = epCountMatch ? parseInt(epCountMatch[1], 10) : 0;
                if (epCount > 0 && epCount <= 2000) {
                    for (var i = 1; i <= epCount; i++) {
                        chapters.push({ name: "Episode " + i, url: slug + "||" + i });
                    }
                } else {
                    // Fallback: just ep 1
                    chapters.push({ name: "Episode 1", url: slug + "||1" });
                }
            }

            // Sort episodes ascending
            chapters.sort(function(a, b) {
                var na = parseInt((a.url.split("||")[1] || "0"), 10);
                var nb = parseInt((b.url.split("||")[1] || "0"), 10);
                return na - nb;
            });

            console.log("Detail: " + name + ", " + chapters.length + " eps");
        } catch(e) {
            console.log("getDetail error: " + e);
        }

        return { name, imageUrl, description, genre, status, chapters };
    }

    // ── getVideoList ──────────────────────────────────────────────────────────
    // url format: "{slug}||{epNum}"
    async getVideoList(url) {
        var parts = url.split("||");
        if (parts.length < 2) {
            console.log("Invalid episode URL: " + url);
            return [];
        }
        var slug = parts[0];
        var epNum = parts[1];
        var epUrl = this.baseUrl + "/watch/" + slug + "/ep-" + epNum;

        console.log("AniKoto getVideoList: " + epUrl);

        try {
            var headers = this.getHeaders();
            var ajaxHeaders = Object.assign({}, headers, { "X-Requested-With": "XMLHttpRequest" });

            // 1. Fetch the episode page to get the mangaId
            var res = await this.client.get(epUrl, headers);
            if (res.statusCode !== 200) {
                console.log("Episode page error: " + res.statusCode);
                return [];
            }
            var html = res.body;
            
            var mangaIdMatch = html.match(/const mangaId\s*=\s*(\d+)/i) || html.match(/api\/watch-order\/(\d+)/i);
            if (!mangaIdMatch) {
                console.log("No mangaId found on page");
                return [{ url: epUrl, originalUrl: epUrl, quality: "Web", headers: { "Referer": this.baseUrl + "/" } }];
            }
            var mangaId = mangaIdMatch[1];

            // 2. Fetch the episode list JSON to get the encrypted server IDs for this episode
            var epListRes = await this.client.get(this.baseUrl + "/ajax/episode/list/" + mangaId, ajaxHeaders);
            if (epListRes.statusCode !== 200) return [];
            
            var listHtml = "";
            try {
                listHtml = JSON.parse(epListRes.body).result;
            } catch(e) { listHtml = epListRes.body; }

            // Find the correct episode by href ending in /ep-{epNum}
            var epRegex = new RegExp(`href=["'][^"']+\\/ep-${epNum}["'][^>]*data-ids=["']([^"']+)["']`, 'i');
            var match = listHtml.match(epRegex);
            if (!match) {
                epRegex = new RegExp(`data-ids=["']([^"']+)["'][^>]*href=["'][^"']+\\/ep-${epNum}["']`, 'i');
                match = listHtml.match(epRegex);
            }
            if (!match) {
                var slugRegex = new RegExp(`data-slug=["']${epNum}["'][^>]*data-ids=["']([^"']+)["']`, 'i');
                match = listHtml.match(slugRegex);
            }
            if (!match) {
                var slugRegex2 = new RegExp(`data-ids=["']([^"']+)["'][^>]*data-slug=["']${epNum}["']`, 'i');
                match = listHtml.match(slugRegex2);
            }
            
            if (!match) {
                console.log("Could not find data-ids for ep " + epNum);
                return [{ url: epUrl, originalUrl: epUrl, quality: "Web", headers: { "Referer": this.baseUrl + "/" } }];
            }
            var dataIds = match[1];

            // 3. Fetch the servers list for this episode
            var serverListRes = await this.client.get(this.baseUrl + "/ajax/server/list?servers=" + encodeURIComponent(dataIds), ajaxHeaders);
            if (serverListRes.statusCode !== 200) return [];

            var serverHtml = "";
            try {
                serverHtml = JSON.parse(serverListRes.body).result;
            } catch(e) { serverHtml = serverListRes.body; }

            var linkIdRegex = /data-link-id=["']([^"']+)["'][^>]*>([^<]+)<\/li>/gi;
            var lm;
            var servers = [];
            while ((lm = linkIdRegex.exec(serverHtml)) !== null) {
                servers.push({ id: lm[1], name: lm[2].trim() });
            }

            var videos = [];
            
            // 4. Resolve the actual embed URL for each server
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
                    console.log("Error fetching server details for " + s.name + ": " + err);
                }
            }

            if (videos.length === 0) {
                videos.push({
                    url: epUrl,
                    originalUrl: epUrl,
                    quality: "Web",
                    headers: { "Referer": this.baseUrl + "/" }
                });
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
