const mangayomiSources = [{
    "name": "AnimeidHentai",
    "lang": "en",
    "baseUrl": "https://animeidhentai.com",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=animeidhentai.com",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": true,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/mangayomi-extensionstet/main/javascript/anime/src/en/animeidhentai.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 392817456,
    "notes": "",
    "pkgPath": "anime/src/en/animeidhentai.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.baseUrl = "https://animeidhentai.com";
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://animeidhentai.com/"
        };
    }

    async request(url) {
        var res = await this.client.get(url, this.getHeaders());
        return new Document(res.body);
    }

    parseAnimeList(doc) {
        var list = [];
        var items = doc.select("article.post");
        if (!items || items.length === 0) {
            items = doc.select(".post-grid article, .grid-item, article");
        }
        console.log("parseAnimeList items: " + items.length);

        for (var item of items) {
            try {
                var linkEl = item.selectFirst("a");
                if (!linkEl) continue;
                var link = linkEl.attr("href") || "";
                if (!link) continue;

                var title = "";
                var titleEl = item.selectFirst("h2, h3, .entry-title, .post-title");
                if (titleEl) {
                    title = titleEl.text.trim();
                }
                if (!title) {
                    title = linkEl.attr("title") || "";
                }

                var imageUrl = "";
                var imgEl = item.selectFirst("img");
                if (imgEl) {
                    imageUrl = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.getSrc || "";
                }

                if (!link.startsWith("http")) {
                    link = this.baseUrl + (link.startsWith("/") ? link : "/" + link);
                }
                if (imageUrl && !imageUrl.startsWith("http")) {
                    if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
                    else imageUrl = this.baseUrl + imageUrl;
                }

                if (title && link) {
                    list.push({ name: title, imageUrl, link });
                }
            } catch (e) {
                console.log("Parse item error: " + e);
            }
        }
        return list;
    }

    hasNextPage(doc) {
        var next = doc.selectFirst("a.next, .nav-previous a, .pagination .next");
        return next != null;
    }

    async getPopular(page) {
        var url = this.baseUrl + "/portal/" + (page > 1 ? "page/" + page + "/" : "");
        console.log("getPopular: " + url);
        try {
            var doc = await this.request(url);
            var list = this.parseAnimeList(doc);
            var hasNextPage = this.hasNextPage(doc);
            console.log("getPopular: " + list.length + " results");
            return { list, hasNextPage };
        } catch (e) {
            console.log("getPopular error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        var url = this.baseUrl + (page > 1 ? "/page/" + page + "/" : "/");
        console.log("getLatestUpdates: " + url);
        try {
            var doc = await this.request(url);
            var list = this.parseAnimeList(doc);
            var hasNextPage = this.hasNextPage(doc);
            return { list, hasNextPage };
        } catch (e) {
            console.log("getLatestUpdates error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        var url = this.baseUrl + "/?s=" + encodeURIComponent(query) + (page > 1 ? "&paged=" + page : "");
        console.log("search: " + url);
        try {
            var doc = await this.request(url);
            var list = this.parseAnimeList(doc);
            var hasNextPage = this.hasNextPage(doc);
            console.log("search: " + list.length + " results");
            return { list, hasNextPage };
        } catch (e) {
            console.log("search error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        console.log("getDetail: " + url);
        try {
            var doc = await this.request(url);

            var title = "";
            var titleEl = doc.selectFirst("h1.entry-title, h1.post-title, h1");
            if (titleEl) title = titleEl.text.trim();

            var imageUrl = "";
            var imgEl = doc.selectFirst(".post-thumbnail img, .wp-post-image, article img");
            if (imgEl) {
                imageUrl = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.getSrc || "";
            }
            if (!imageUrl) {
                var ogImg = doc.selectFirst("meta[property='og:image']");
                if (ogImg) imageUrl = ogImg.attr("content") || "";
            }
            if (imageUrl && !imageUrl.startsWith("http")) {
                if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
                else imageUrl = this.baseUrl + imageUrl;
            }

            var description = "";
            var descEl = doc.selectFirst(".entry-content p, .post-content p, .synopsis");
            if (descEl) description = descEl.text.trim();

            var genre = [];
            var genreEls = doc.select("a[rel=category+tag], .genre a, .post-categories a");
            for (var g of genreEls) {
                var gt = g.text.trim();
                if (gt) genre.push(gt);
            }

            var chapters = [];
            var epLinks = doc.select(".eplister ul li a, .episode-list a, .ep-list a");
            console.log("Episode links found: " + epLinks.length);

            for (var epLink of epLinks) {
                try {
                    var href = epLink.attr("href") || "";
                    if (!href) continue;
                    if (!href.startsWith("http")) {
                        href = this.baseUrl + (href.startsWith("/") ? href : "/" + href);
                    }
                    var epNumEl = epLink.selectFirst(".epl-num, .episode-number");
                    var epTitleEl = epLink.selectFirst(".epl-title, .episode-title");
                    var epNum = epNumEl ? epNumEl.text.trim() : "";
                    var epTitle = epTitleEl ? epTitleEl.text.trim() : "";
                    var epName = epNum || epTitle || href.split("/").filter(Boolean).pop() || "Episode";
                    if (epTitle && epNum) epName = epNum + ": " + epTitle;
                    chapters.push({ name: epName, url: href });
                } catch (e) {
                    console.log("Episode parse error: " + e);
                }
            }

            if (chapters.length === 0) {
                chapters.push({ name: "Episode 1", url: url });
            }

            return {
                link: url,
                name: title,
                imageUrl,
                description,
                genre,
                status: 5,
                chapters
            };
        } catch (e) {
            console.log("getDetail error: " + e);
            return { name: "", imageUrl: "", description: "", genre: [], status: 5, chapters: [] };
        }
    }

    async getVideoList(url) {
        console.log("getVideoList: " + url);
        try {
            var res = await this.client.get(url, this.getHeaders());
            if (res.statusCode !== 200) return [];

            var html = res.body;
            var doc = new Document(html);
            var videos = [];

            var r2Matches = html.match(/https?:\/\/r2\.1hanime\.com[^\s"'<>]*/g) || [];
            for (var r2Url of r2Matches) {
                if (!videos.some(function(v) { return v.url === r2Url; })) {
                    videos.push({
                        url: r2Url,
                        originalUrl: r2Url,
                        quality: "Direct - MP4",
                        headers: { "Referer": url }
                    });
                }
            }

            var videoSources = doc.select("video source, video > source");
            for (var vsrc of videoSources) {
                var srcUrl = vsrc.attr("src") || "";
                var quality = vsrc.attr("label") || vsrc.attr("size") || "Default";
                if (srcUrl && !videos.some(function(v) { return v.url === srcUrl; })) {
                    if (!srcUrl.startsWith("http")) {
                        if (srcUrl.startsWith("//")) srcUrl = "https:" + srcUrl;
                        else srcUrl = this.baseUrl + srcUrl;
                    }
                    videos.push({
                        url: srcUrl,
                        originalUrl: srcUrl,
                        quality: "Video - " + quality,
                        headers: { "Referer": url }
                    });
                }
            }

            var iframes = doc.select("iframe");
            for (var iframe of iframes) {
                try {
                    var iframeSrc = iframe.attr("src") || "";
                    if (!iframeSrc) continue;
                    if (!iframeSrc.startsWith("http")) {
                        if (iframeSrc.startsWith("//")) iframeSrc = "https:" + iframeSrc;
                        else iframeSrc = this.baseUrl + iframeSrc;
                    }
                    console.log("Checking iframe: " + iframeSrc);

                    var iframeRes = await this.client.get(iframeSrc, {
                        "Referer": url,
                        "User-Agent": this.getHeaders()["User-Agent"]
                    });
                    if (iframeRes.statusCode !== 200) continue;

                    var iframeHtml = iframeRes.body;

                    var mp4Matches = iframeHtml.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g) || [];
                    for (var mp4 of mp4Matches) {
                        if (!videos.some(function(v) { return v.url === mp4; })) {
                            videos.push({
                                url: mp4,
                                originalUrl: mp4,
                                quality: "Iframe - MP4",
                                headers: { "Referer": iframeSrc }
                            });
                        }
                    }
                } catch (ie) {
                    console.log("Iframe error: " + ie);
                }
            }

            var mp4Direct = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g) || [];
            for (var mp4d of mp4Direct) {
                if (!videos.some(function(v) { return v.url === mp4d; })) {
                    videos.push({
                        url: mp4d,
                        originalUrl: mp4d,
                        quality: "Direct - MP4",
                        headers: { "Referer": url }
                    });
                }
            }

            console.log("Total videos: " + videos.length);
            return videos;
        } catch (e) {
            console.log("getVideoList error: " + e);
            return [];
        }
    }

    async getPageList(url) {
        return [];
    }

    getFilterList() {
        return [];
    }

    getSourcePreferences() {
        return [];
    }
}
