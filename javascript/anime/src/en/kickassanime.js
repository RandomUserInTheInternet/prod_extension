const mangayomiSources = [{
    "name": "KickAssAnime",
    "lang": "en",
    "baseUrl": "https://kaa.lt",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=kaa.lt",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.3",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/mangayomi-extensionstet/main/javascript/anime/src/en/kickassanime.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 723849156,
    "notes": "KickAssAnime (kaa.lt) with HLS stream extraction from krussdomi.com player",
    "pkgPath": "anime/src/en/kickassanime.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.baseUrl = "https://kaa.lt";
        this.posterBase = "https://kaa.lt/image/poster/";
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Referer": this.baseUrl + "/",
            "Accept": "application/json, */*; q=0.01",
            "Origin": this.baseUrl
        };
    }

    // Build a poster URL from the API poster object
    // API returns: { hq: "slug-hq", sm: "slug-sm", formats: [...] }
    // Full URL:    https://kaa.lt/image/poster/{slug}.webp
    buildPoster(posterObj) {
        if (!posterObj) return "";
        var slug = posterObj.hq || posterObj.sm || "";
        if (!slug) return "";
        return this.posterBase + slug + ".webp";
    }

    // GET /api{path}
    async apiGet(path) {
        var url = this.baseUrl + "/api" + path;
        console.log("KAA GET: " + url);
        var res = await this.client.get(url, this.getHeaders());
        if (res.statusCode !== 200) {
            console.log("KAA GET " + res.statusCode + " for " + url);
            throw new Error("API returned " + res.statusCode);
        }
        return JSON.parse(res.body);
    }

    // Search POST — body must be a plain JS object (NOT JSON.stringify).
    // Mangayomi's client.post() serializes the object internally.
    // See: novelupdates.js pattern: client.post(url, headers, { key: val })
    async searchPost(query, page) {
        var url = this.baseUrl + "/api/fsearch";
        console.log("KAA searchPost: query=" + query + " page=" + page);
        var res = await this.client.post(url, {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
        }, { page: page, query: query });
        console.log("KAA searchPost status: " + res.statusCode);
        if (res.statusCode !== 200) {
            throw new Error("searchPost returned " + res.statusCode);
        }
        return JSON.parse(res.body);
    }

    // Map KAA status string to Mangayomi int
    parseStatus(statusStr) {
        if (!statusStr) return 5;
        var s = statusStr.toLowerCase();
        if (s.includes("currently_airing") || s.includes("airing")) return 0;
        if (s.includes("finished") || s.includes("completed")) return 1;
        if (s.includes("not_yet_aired") || s.includes("upcoming")) return 3;
        return 5;
    }

    // getPopular: currently airing anime
    async getPopular(page) {
        console.log("KAA getPopular page=" + page);
        try {
            var data = await this.apiGet("/anime?page=" + page + "&status=currently_airing");
            var list = [];
            var items = data.result || [];
            for (var item of items) {
                if (!item.watch_uri) continue;
                list.push({
                    name: item.title_en || item.title || "",
                    imageUrl: this.buildPoster(item.poster),
                    link: item.slug || ""
                });
            }
            var maxPage = data.maxPage || 1;
            console.log("getPopular: " + list.length + " results, maxPage=" + maxPage);
            return { list, hasNextPage: page < maxPage };
        } catch (e) {
            console.log("getPopular error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    // getLatestUpdates: all anime sorted by recency
    async getLatestUpdates(page) {
        console.log("KAA getLatestUpdates page=" + page);
        try {
            var data = await this.apiGet("/anime?page=" + page);
            var list = [];
            var items = data.result || [];
            for (var item of items) {
                if (!item.watch_uri) continue;
                list.push({
                    name: item.title_en || item.title || "",
                    imageUrl: this.buildPoster(item.poster),
                    link: item.slug || ""
                });
            }
            var maxPage = data.maxPage || 1;
            console.log("getLatestUpdates: " + list.length + " results");
            return { list, hasNextPage: page < maxPage };
        } catch (e) {
            console.log("getLatestUpdates error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    // search: POST /api/fsearch with { page, query }
    async search(query, page, filters) {
        console.log("KAA search: " + query);
        try {
            var data = await this.searchPost(query, page);
            var list = [];
            var items = data.result || [];
            for (var item of items) {
                if (!item.watch_uri) continue;
                list.push({
                    name: item.title_en || item.title || "",
                    imageUrl: this.buildPoster(item.poster),
                    link: item.slug || ""
                });
            }
            var maxPage = data.maxPage || 1;
            console.log("search: " + list.length + " results");
            return { list, hasNextPage: page < maxPage };
        } catch (e) {
            console.log("search error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    // getDetail: show metadata + full episode list
    async getDetail(url) {
        console.log("KAA getDetail: " + url);
        try {
            var animeSlug = url;

            var show = await this.apiGet("/show/" + animeSlug);

            var title = show.title_en || show.title || "";
            var imageUrl = this.buildPoster(show.poster);
            var description = show.synopsis || "";
            var genre = show.genres || [];
            var status = this.parseStatus(show.status);

            // Use sub/dub preference to pick language locale
            var prefLang = new SharedPreferences().get("sub_or_dub") || "ja-JP";
            var lang = prefLang;
            // Verify the preferred locale is available; if not, fall back to first
            if (show.locales && show.locales.length > 0) {
                if (show.locales.includes(prefLang)) {
                    lang = prefLang;
                } else {
                    lang = show.locales[0];
                }
            }

            // Fetch episodes (all pages)
            var chapters = [];
            var firstPage = await this.apiGet("/show/" + animeSlug + "/episodes?ep=1&lang=" + lang);
            var pages = firstPage.pages || [];
            var allEpisodes = firstPage.result || [];

            for (var p = 1; p < pages.length; p++) {
                try {
                    var pageData = await this.apiGet(
                        "/show/" + animeSlug + "/episodes?ep=" + pages[p].from + "&lang=" + lang
                    );
                    allEpisodes = allEpisodes.concat(pageData.result || []);
                } catch (pe) {
                    console.log("Episode page " + p + " error: " + pe);
                }
            }

            // Sort newest first
            allEpisodes.sort(function(a, b) { return b.episode_number - a.episode_number; });

            for (var ep of allEpisodes) {
                var epNum = ep.episode_number || 0;
                var epSlug = ep.slug || "";
                chapters.push({
                    name: "Episode " + ep.episode_string,
                    url: animeSlug + "||ep-" + epNum + "-" + epSlug + "||" + lang,
                    dateUpload: null
                });
            }

            console.log("getDetail: " + title + ", " + chapters.length + " episodes");
            return {
                link: this.baseUrl + "/" + animeSlug,
                name: title || "KickAssAnime Show",
                imageUrl,
                description,
                genre,
                status,
                chapters
            };
        } catch (e) {
            console.log("getDetail error: " + e);
            return { name: "", imageUrl: "", description: "", genre: [], status: 5, chapters: [] };
        }
    }

    // getVideoList: fetch krussdomi player page and extract .m3u8 manifest
    async getVideoList(url) {
        console.log("KAA getVideoList: " + url);
        try {
            var parts = url.split("||");
            if (parts.length < 2) {
                console.log("Invalid episode URL format");
                return [];
            }
            var animeSlug = parts[0];
            var episodeSlug = parts[1];
            var lang = parts[2] || "ja-JP";

            var epInfo = await this.apiGet("/show/" + animeSlug + "/episode/" + episodeSlug);

            var servers = epInfo.servers || [];
            if (servers.length === 0) {
                console.log("No servers found for episode");
                return [];
            }

            var videos = [];

            for (var server of servers) {
                try {
                    var playerUrl = server.src || "";
                    var serverName = server.shortName || server.name || "KAA";

                    if (!playerUrl) continue;
                    console.log("Fetching player: " + playerUrl);

                    var playerRes = await this.client.get(playerUrl, {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
                        "Referer": this.baseUrl + "/",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                    });
                    if (playerRes.statusCode !== 200) {
                        console.log("Player page status: " + playerRes.statusCode);
                        continue;
                    }

                    var playerHtml = playerRes.body;
                    var m3u8Url = null;

                    // Primary: astro-island props (HTML-encoded JSON)
                    // Pattern: &quot;manifest&quot;:[0,&quot;https://hls.krussdomi.com/...&quot;]
                    var propsMatch = playerHtml.match(/&quot;manifest&quot;:\[0,&quot;(https?:\/\/[^&]+)&quot;\]/);
                    if (propsMatch) {
                        m3u8Url = propsMatch[1];
                        console.log("Found manifest (props): " + m3u8Url);
                    }

                    // Fallback: playlist.m3u8 on krussdomi
                    if (!m3u8Url) {
                        var cdnMatch = playerHtml.match(/https?:\/\/hls\.krussdomi\.com\/[^"'\s&]+playlist\.m3u8/);
                        if (cdnMatch) {
                            m3u8Url = cdnMatch[0];
                            console.log("Found manifest (fallback1): " + m3u8Url);
                        }
                    }

                    // Fallback 2: any .m3u8 on krussdomi
                    if (!m3u8Url) {
                        var anyM3u8 = playerHtml.match(/https?:\/\/hls\.krussdomi\.com\/[^"'\s&]+\.m3u8/);
                        if (anyM3u8) {
                            m3u8Url = anyM3u8[0];
                            console.log("Found manifest (fallback2): " + m3u8Url);
                        }
                    }

                    if (m3u8Url) {
                        videos.push({
                            url: m3u8Url,
                            originalUrl: m3u8Url,
                            quality: "KAA " + serverName,
                            headers: {
                                "Referer": "https://krussdomi.com/",
                                "Origin": "https://krussdomi.com"
                            }
                        });
                    } else {
                        console.log("No m3u8 found for server: " + serverName);
                    }
                } catch (serverErr) {
                    console.log("Server error: " + serverErr);
                }
            }

            // Sort by preferred quality — put the preferred resolution first
            var prefQuality = new SharedPreferences().get("preferred_quality") || "1080";
            videos.sort(function(a, b) {
                var aMatch = (a.quality || "").includes(prefQuality) ? 0 : 1;
                var bMatch = (b.quality || "").includes(prefQuality) ? 0 : 1;
                return aMatch - bMatch;
            });

            console.log("Total videos: " + videos.length);
            return videos;
        } catch (e) {
            console.log("getVideoList error: " + e);
            return [];
        }
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "preferred_quality",
                listPreference: {
                    title: "Preferred Quality",
                    summary: "Select your preferred video resolution",
                    valueIndex: 0,
                    entries: ["1080p", "720p", "480p", "360p"],
                    entryValues: ["1080", "720", "480", "360"]
                }
            },
            {
                key: "sub_or_dub",
                listPreference: {
                    title: "Prefer Subs or Dubs?",
                    summary: "Preferred audio type",
                    valueIndex: 0,
                    entries: ["Subs", "Dubs"],
                    entryValues: ["ja-JP", "en-US"]
                }
            },
            {
                key: "preferred_server",
                listPreference: {
                    title: "Preferred Video Server",
                    summary: "Select your preferred server (any = no preference)",
                    valueIndex: 0,
                    entries: ["Any", "Default"],
                    entryValues: ["any", "default"]
                }
            }
        ];
    }
}
