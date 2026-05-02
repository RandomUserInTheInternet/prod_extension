const mangayomiSources = [{
    "name": "AniHQ [Not Working]",
    "lang": "en",
    "baseUrl": "https://anihq.org",
    "apiUrl": "https://anihq.org/wp-json/wp/v2",
    "iconUrl": "https://anihq.org/wp-content/uploads/cropped-Icon-270x270.webp",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.4",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/prod_extension/main/javascript/anime/src/en/anihq.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 982138761,
    "notes": "AniHQ anime streaming with Voe extraction",
    "pkgPath": "anime/src/en/anihq.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://anihq.org/",
            "Accept": "application/json, text/plain, */*"
        };
    }

    extractImage(item) {
        try {
            if (item._embedded && item._embedded['wp:featuredmedia'] &&
                item._embedded['wp:featuredmedia'].length > 0) {
                return item._embedded['wp:featuredmedia'][0].source_url || "";
            }
        } catch(e) {}
        return "";
    }

    buildList(data) {
        var list = [];
        for (var item of data) {
            list.push({
                name: item.title?.rendered || "",
                imageUrl: this.extractImage(item),
                link: item.slug
            });
        }
        return list;
    }

    async getPopular(page) {
        var res = await this.client.get(
            `https://anihq.org/wp-json/wp/v2/anime?per_page=20&page=${page}&_embed=1`,
            this.getHeaders()
        );
        var data = JSON.parse(res.body);
        return { list: this.buildList(data), hasNextPage: data.length === 20 };
    }

    async getLatestUpdates(page) {
        var res = await this.client.get(
            `https://anihq.org/wp-json/wp/v2/anime?per_page=20&page=${page}&orderby=date&order=desc&_embed=1`,
            this.getHeaders()
        );
        var data = JSON.parse(res.body);
        return { list: this.buildList(data), hasNextPage: data.length === 20 };
    }

    async search(query, page, filters) {
        var res = await this.client.get(
            `https://anihq.org/wp-json/wp/v2/anime?search=${encodeURIComponent(query)}&per_page=20&page=${page}&_embed=1`,
            this.getHeaders()
        );
        var data = JSON.parse(res.body);
        return { list: this.buildList(data), hasNextPage: data.length === 20 };
    }

    async getDetail(url) {
        var res = await this.client.get(
            `https://anihq.org/wp-json/wp/v2/anime?slug=${url}&_embed=1`,
            this.getHeaders()
        );
        var data = JSON.parse(res.body);
        if (!data || data.length === 0) return {};

        var item = data[0];
        var name = item.title?.rendered || "";

        var description = (item.content?.rendered || item.excerpt?.rendered || "")
            .replace(/<[^>]*>/gm, '').trim();

        var imageUrl = this.extractImage(item);

        var genre = [];
        if (item._embedded && item._embedded['wp:term']) {
            for (var terms of item._embedded['wp:term']) {
                for (var t of terms) {
                    genre.push(t.name);
                }
            }
        }

        // Get the latest episode URL to use its sidebar for the full episode list
        var htmlRes = await this.client.get(
            `https://anihq.org/anime-show/${url}/`,
            this.getHeaders()
        );
        var watchUrlMatch = htmlRes.body.match(/href=["'](https:\/\/anihq\.org\/watch\/[^"']+)["']/);

        var chapters = [];
        if (watchUrlMatch && watchUrlMatch[1]) {
            var watchRes = await this.client.get(watchUrlMatch[1], this.getHeaders());
            var html = watchRes.body;

            // Use data-episode-search-query for reliable episode number extraction
            // Pattern: href="https://anihq.org/watch/SLUG/" ... data-episode-search-query="N"
            var epRegex = /href=["']https:\/\/anihq\.org\/watch\/([^"'\/]+)\/?["'][^>]*data-episode-search-query=["']([^"']+)["']/gi;
            var match;
            var added = new Set();

            while ((match = epRegex.exec(html)) !== null) {
                var epSlug = match[1];
                var epNum = match[2].trim();
                if (!added.has(epSlug)) {
                    added.add(epSlug);
                    chapters.push({
                        name: "Episode " + epNum,
                        url: epSlug
                    });
                }
            }

            // Fallback: extract from href only if primary failed
            if (chapters.length === 0) {
                var fallback = /href=["']https:\/\/anihq\.org\/watch\/([^"'\/]+)\/?["']/gi;
                while ((match = fallback.exec(html)) !== null) {
                    var epSlug = match[1];
                    if (!added.has(epSlug) && epSlug.includes("episode")) {
                        added.add(epSlug);
                        var numMatch = epSlug.match(/episode[-_](\d+)/i);
                        chapters.push({
                            name: numMatch ? "Episode " + numMatch[1] : epSlug,
                            url: epSlug
                        });
                    }
                }
            }
        }

        chapters.reverse(); // Newest first

        return {
            name: name,
            imageUrl: imageUrl,
            description: description,
            genre: genre,
            status: 0,
            chapters: chapters
        };
    }

    // Extract m3u8 from Voe embed HTML using multiple known patterns
    extractM3u8FromHtml(html) {
        var patterns = [
            // Pattern 1: hls key in JS object  e.g.  hls: "https://..."  or  'hls':"..."
            /['"]hls['"]\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
            // Pattern 2: file key in sources array
            /['"]file['"]\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
            // Pattern 3: src key
            /['"]src['"]\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
            // Pattern 4: any .m3u8 URL in quotes
            /['"]([^'"]+\.m3u8[^'"]*)['"]/i,
            // Pattern 5: bare m3u8 URL
            /(https?:\/\/[^\s<>"']+\.m3u8[^\s<>"']*)/i,
        ];

        for (var pat of patterns) {
            var m = html.match(pat);
            if (m) {
                var candidate = m[1];
                if (candidate && candidate.startsWith("http")) {
                    return candidate;
                }
            }
        }

        // Pattern 6: base64 encoded URL (Voe sometimes encodes with atob)
        var b64Matches = html.match(/atob\(['"]([A-Za-z0-9+\/=]{20,})['"]\)/g) || [];
        for (var encoded of b64Matches) {
            try {
                var inner = encoded.match(/atob\(['"]([^'"]+)['"]\)/)[1];
                var decoded = atob(inner);
                if (decoded.includes(".m3u8")) {
                    var urlM = decoded.match(/(https?:\/\/[^\s'"]+\.m3u8[^\s'"]*)/);
                    if (urlM) return urlM[1];
                }
            } catch(e) {}
        }

        return null;
    }

    async getVideoList(url) {
        // Fetch the episode page HTML to get iframe URL
        var res = await this.client.get(
            `https://anihq.org/watch/${url}/`,
            this.getHeaders()
        );
        var html = res.body;

        var iframeMatch = html.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i);
        if (!iframeMatch) return [];
        var iframeUrl = iframeMatch[1];

        var videos = [];

        // Handle Voe.sx
        if (iframeUrl.includes("voe.sx") || iframeUrl.includes("voe.network") || iframeUrl.includes("richardquestionbuilding.com")) {
            var m3u8 = null;
            try {
                // Mangayomi Client follows HTTP redirects, so fetching the embed URL
                // should land on the actual player page (richardquestionbuilding.com/access/...)
                // which contains the JWPlayer config with the signed m3u8 URL in HTML
                var voeRes = await this.client.get(iframeUrl, {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://anihq.org/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                });
                
                var body = voeRes.body;
                var redirMatch = body.match(/window\.location\.href\s*=\s*['"](https?:\/\/[^'"]+)['"]/) || 
                                 body.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["']\d+;\s*url=['"]?(https?:\/\/[^'"]+?)['"]?["']/i);
                
                if (redirMatch) {
                    var voeRes2 = await this.client.get(redirMatch[1], {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": iframeUrl
                    });
                    body = voeRes2.body;
                }
                
                m3u8 = this.extractM3u8FromHtml(body);
            } catch(e) {
                console.log("Voe fetch error: " + e);
            }

            if (m3u8) {
                videos.push({
                    url: m3u8,
                    originalUrl: m3u8,
                    quality: "Voe",
                    headers: { "Referer": "https://voe.sx/" }
                });
            } else {
                videos.push({
                    url: iframeUrl,
                    originalUrl: iframeUrl,
                    quality: "Voe (Embed)",
                    headers: { "Referer": "https://anihq.org/" }
                });
            }

        } else {
            // Unknown embed — return raw iframe URL
            videos.push({
                url: iframeUrl,
                originalUrl: iframeUrl,
                quality: "Embed",
                headers: { "Referer": "https://anihq.org/" }
            });
        }

        return videos;
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
