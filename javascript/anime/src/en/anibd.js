const mangayomiSources = [{
    "name": "AniBD [X]",
    "lang": "en",
    "baseUrl": "https://anibd.app",
    "apiUrl": "https://eng.animeapps.top/api",
    "iconUrl": "https://anibd.app/favicon.ico",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.2",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/prod_extension/main/javascript/anime/src/en/anibd.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 738291456,
    "notes": "AniBD [X]",
    "pkgPath": "anime/src/en/anibd.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://anibd.app/",
            "Accept": "application/json, text/plain, */*"
        };
    }

    buildList(data) {
        var list = [];
        for (var item of data) {
            var imageUrl = item.ani_cover_large || item.ani_cover_medium || item.postthum || "";
            list.push({
                name: item.postname || "",
                imageUrl: imageUrl,
                link: item.postid + "_" + (item.anilist || "0")
            });
        }
        return list;
    }

    async getPopular(page) {
        var res = await this.client.get(
            `https://eng.animeapps.top/api/singlefilter.php?categorytagid=2&page=${page}&limit=20`,
            this.getHeaders()
        );
        var data = JSON.parse(res.body);
        var items = data.data || [];
        var hasNext = data.pagination ? data.pagination.current_page < data.pagination.total_pages : items.length === 20;
        return { list: this.buildList(items), hasNextPage: hasNext };
    }

    async getLatestUpdates(page) {
        var res = await this.client.get(
            `https://eng.animeapps.top/api/singlefilter.php?categorytagid=2&page=${page}&limit=20`,
            this.getHeaders()
        );
        var data = JSON.parse(res.body);
        var items = data.data || [];
        var hasNext = data.pagination ? data.pagination.current_page < data.pagination.total_pages : items.length === 20;
        return { list: this.buildList(items), hasNextPage: hasNext };
    }

    async search(query, page, filters) {
        var res = await this.client.get(
            `https://eng.animeapps.top/api/search3.php?keyword=${encodeURIComponent(query)}&page=${page}&limit=20`,
            this.getHeaders()
        );
        var data = JSON.parse(res.body);
        var items = data.data || [];
        var hasNext = data.pagination ? data.pagination.current_page < data.pagination.total_pages : items.length === 20;
        return { list: this.buildList(items), hasNextPage: hasNext };
    }

    async getDetail(url) {
        var parts = url.split("_");
        var postId = parts[0];
        var anilistId = parts[1] || "0";

        var name = "";
        var imageUrl = "";
        var description = "";
        var genre = [];
        var status = 0;

        // Use AniList GraphQL API for metadata â€” avoids timing out on anibd.app HTML
        if (anilistId && anilistId !== "0") {
            try {
                var query = `{\n  Media(id: ${anilistId}, type: ANIME) {\n    title { romaji english native }\n    description(asHtml: false)\n    coverImage { large medium }\n    genres\n    status\n  }\n}`;
                var gqlRes = await this.client.post(
                    "https://graphql.anilist.co",
                    { "Content-Type": "application/json" },
                    JSON.stringify({ query: query })
                );
                var gqlData = JSON.parse(gqlRes.body);
                var media = gqlData.data && gqlData.data.Media;
                if (media) {
                    name = media.title.english || media.title.romaji || media.title.native || "";
                    imageUrl = (media.coverImage && media.coverImage.large) || "";
                    description = (media.description || "").replace(/<[^>]*>/g, "").trim();
                    genre = media.genres || [];
                    var s = media.status || "";
                    if (s === "FINISHED") status = 1;
                    else if (s === "RELEASING") status = 0;
                    else if (s === "NOT_YET_RELEASED") status = 2;
                    else if (s === "CANCELLED") status = 3;
                }
            } catch(e) {
                console.log("AniList fetch error: " + e);
            }
        }

        // Fetch episodes from epeng API
        var chapters = [];
        if (anilistId && anilistId !== "0") {
            try {
                var epRes = await this.client.get(
                    `https://epeng.animeapps.top/api2.php?epid=${anilistId}`,
                    this.getHeaders()
                );
                var epData = JSON.parse(epRes.body);
                if (Array.isArray(epData)) {
                    for (var server of epData) {
                        var serverName = server.server_name || "Sub";
                        var serverData = server.server_data || [];
                        for (var ep of serverData) {
                            chapters.push({
                                name: serverName + " - Episode " + (ep.name || ep.slug),
                                url: ep.link
                            });
                        }
                    }
                }
            } catch(e) {
                console.log("Episode fetch error: " + e);
            }
        }

        // Fallback: scrape episodes from anibd.app play page if epeng returned nothing
        if (chapters.length === 0) {
            try {
                var detailRes = await this.client.get(
                    `https://anibd.app/${postId}/`,
                    this.getHeaders()
                );
                var html = detailRes.body;
                var epLinks = html.match(/playid\/\d+\/\?server=\d+&(?:amp;)?slug=[^"']+/g);
                if (epLinks) {
                    var added = new Set();
                    for (var link of epLinks) {
                        var slugMatch = link.match(/server=(\d+)&(?:amp;)?slug=([^"'&]+)/);
                        if (slugMatch && !added.has(slugMatch[2])) {
                            added.add(slugMatch[2]);
                            chapters.push({
                                name: "Episode " + slugMatch[2],
                                url: postId + "_html_" + slugMatch[1] + "_" + slugMatch[2]
                            });
                        }
                    }
                }
            } catch(e) {
                console.log("HTML fallback error: " + e);
            }
        }

        return { name, imageUrl, description, genre, status, chapters };
    }

    async getVideoList(url) {
        var epLink = "";

        if (url.includes("_html_")) {
            // Fallback path: get episode link from anibd.app play page
            var parts = url.split("_html_");
            var postId = parts[0];
            var rest = parts[1].split("_");
            var serverId = rest[0];
            var slug = rest[1];
            var res = await this.client.get(
                `https://anibd.app/playid/${postId}/?server=${serverId}&slug=${slug}`,
                this.getHeaders()
            );
            var iframeMatch = res.body.match(/iframe[^>]+src=['"]([^'"]+)['"]/i);
            if (iframeMatch) {
                var iframeSrc = iframeMatch[1].replace(/&amp;/g, "&");
                var urlParam = iframeSrc.match(/url=([^&]+)/);
                if (urlParam) epLink = urlParam[1];
            }
        } else {
            epLink = url;
        }

        if (!epLink) return [];

        var embedUrl = `https://playeng.animeapps.top/r2/play2.php?id=ani6&url=${epLink}`;
        
        try {
            var embedRes = await this.client.get(embedUrl, {
                "User-Agent": this.getHeaders()["User-Agent"],
                "Referer": "https://anibd.app/"
            });
            var match = embedRes.body.match(/videoUrl:\s*["']([^"']+)["']/);
            if (match && match[1]) {
                var m3u8 = match[1].startsWith("http") ? match[1] : "https://playeng.animeapps.top" + match[1];
                return [{
                    url: m3u8,
                    originalUrl: m3u8,
                    quality: "SR",
                    headers: { "Referer": "https://playeng.animeapps.top/" }
                }];
            }
        } catch (e) {
            console.log("AniBD [X]" + e);
        }

        return [];
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}

