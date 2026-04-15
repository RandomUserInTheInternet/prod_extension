const mangayomiSources = [{
    "name": "AllManga",
    "lang": "en",
    "baseUrl": "https://allmanga.to",
    "apiUrl": "https://api.allanime.day/api",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=allmanga.to",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.4",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": true,
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/mangayomi-extensionstet/main/javascript/anime/src/en/allmanga.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": 551923847,
    "notes": "AllManga.to (AllAnime) anime streaming with multi-server + sub/dub support",
    "pkgPath": "anime/src/en/allmanga.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.apiUrl = "https://api.allanime.day/api";
        this.baseUrl = "https://allmanga.to";
        this.thumbnailPrefix = "https://wp.youtube-anime.com/aln.youtube-anime.com/";
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Referer": "https://allmanga.to"
        };
    }

    async gqlGet(query, variables) {
        var headers = this.getHeaders();
        headers["Content-Type"] = "application/json";
        headers["Origin"] = "https://allmanga.to";
        
        var bodyObj = { query: query, variables: variables };
        var res = await this.client.post(this.apiUrl, headers, bodyObj);
        
        if (res.statusCode !== 200) {
            console.log("gqlGet error body: " + res.body.substring(0, 500));
        }
        
        return JSON.parse(res.body);
    }

    getTitlePref() {
        try {
            var prefs = new SharedPreferences();
            return prefs.getString("title_lang", "english");
        } catch (e) {
            return "english";
        }
    }

    getTransTypePref() {
        try {
            var prefs = new SharedPreferences();
            return prefs.getString("stream_type", "sub");
        } catch (e) {
            return "sub";
        }
    }

    getPreferredServer() {
        try {
            var prefs = new SharedPreferences();
            return prefs.getString("preferred_server", "yt-mp4");
        } catch (e) {
            return "yt-mp4";
        }
    }

    // New: Fetches preferred quality setting
    getPreferredQuality() {
        try {
            var prefs = new SharedPreferences();
            return prefs.getString("preferred_quality", "1080");
        } catch (e) {
            return "1080";
        }
    }

    pickTitle(show) {
        var pref = this.getTitlePref();
        if (pref === "romaji" && show.name) return show.name;
        if (pref === "native" && show.nativeName) return show.nativeName;
        return show.englishName || show.name || show.nativeName || "";
    }

    parseThumbnail(thumb) {
        if (!thumb) return "";
        if (thumb.startsWith("http")) return thumb;
        return this.thumbnailPrefix + thumb;
    }

    parseShowList(edges) {
        var list = [];
        for (var edge of edges) {
            var title = this.pickTitle(edge);
            if (!title) continue;
            list.push({
                name: title,
                imageUrl: this.parseThumbnail(edge.thumbnail),
                link: edge._id
            });
        }
        return list;
    }

    async getPopular(page) {
        console.log("AllManga getPopular page=" + page);
        try {
            var query = "query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { pageInfo { total } edges { _id name englishName nativeName thumbnail availableEpisodes __typename } } }";
            var variables = {
                search: { sortBy: "Top" },
                limit: 26,
                page: page,
                translationType: this.getTransTypePref(),
                countryOrigin: "ALL"
            };
            var data = await this.gqlGet(query, variables);
            var shows = data.data.shows;
            var list = this.parseShowList(shows.edges);
            var hasNextPage = (page * 26) < shows.pageInfo.total;
            console.log("getPopular: " + list.length + " results");
            return { list, hasNextPage };
        } catch (e) {
            console.log("getPopular error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        console.log("AllManga getLatestUpdates page=" + page);
        try {
            var query = "query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { pageInfo { total } edges { _id name englishName nativeName thumbnail availableEpisodes __typename } } }";
            var variables = {
                search: { sortBy: "Recent" },
                limit: 26,
                page: page,
                translationType: this.getTransTypePref(),
                countryOrigin: "ALL"
            };
            var data = await this.gqlGet(query, variables);
            var shows = data.data.shows;
            var list = this.parseShowList(shows.edges);
            var hasNextPage = (page * 26) < shows.pageInfo.total;
            return { list, hasNextPage };
        } catch (e) {
            console.log("getLatestUpdates error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        console.log("AllManga search: " + query + " page=" + page);
        try {
            var gql = "query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { pageInfo { total } edges { _id name englishName nativeName thumbnail availableEpisodes __typename } } }";
            var variables = {
                search: { query: query },
                limit: 26,
                page: page,
                translationType: this.getTransTypePref(),
                countryOrigin: "ALL"
            };
            var data = await this.gqlGet(gql, variables);
            var shows = data.data.shows;
            var list = this.parseShowList(shows.edges);
            var hasNextPage = (page * 26) < shows.pageInfo.total;
            console.log("search: " + list.length + " results");
            return { list, hasNextPage };
        } catch (e) {
            console.log("search error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        console.log("AllManga getDetail: " + url);
        try {
            var showId = url;

            var detailQuery = "query ($showId: String!) { show( _id: $showId ) { _id name englishName nativeName thumbnail description status genres studios season score type availableEpisodesDetail availableEpisodes } }";
            var detailData = await this.gqlGet(detailQuery, { showId: showId });
            var show = detailData.data.show;

            var title = this.pickTitle(show);
            var imageUrl = this.parseThumbnail(show.thumbnail);
            var description = show.description || "";
            var genre = show.genres || [];

            var status = 5;
            if (show.status) {
                var s = show.status.toLowerCase();
                if (s.includes("ongoing") || s.includes("releasing")) status = 0;
                else if (s.includes("completed") || s.includes("finished")) status = 1;
                else if (s.includes("hiatus")) status = 2;
                else if (s.includes("cancelled")) status = 3;
                else if (s.includes("upcoming") || s.includes("not_yet")) status = 4;
            }

            var episodesQuery = "query ($showId: String!) { show( _id: $showId ) { _id availableEpisodesDetail } }";
            var epsData = await this.gqlGet(episodesQuery, { showId: showId });
            var epsDetail = epsData.data.show.availableEpisodesDetail || {};

            var transType = this.getTransTypePref();
            var epNumbers = epsDetail[transType] || epsDetail["sub"] || epsDetail["dub"] || [];

            var chapters = [];
            for (var epNum of epNumbers) {
                chapters.push({
                    name: "Episode " + epNum,
                    url: showId + "||" + transType + "||" + epNum
                });
            }

            chapters.sort(function(a, b) {
                var na = parseFloat(a.url.split("||")[2]) || 0;
                var nb = parseFloat(b.url.split("||")[2]) || 0;
                return nb - na;
            });

            var link = this.baseUrl + "/watch/" + showId;

            console.log("getDetail: " + title + ", " + chapters.length + " episodes");

            return {
                link,
                name: title,
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

    xorDecode(encoded) {
        var result = "";
        for (var i = 0; i < encoded.length; i += 2) {
            var hexByte = parseInt(encoded.substring(i, i + 2), 16);
            result += String.fromCharCode(hexByte ^ 56);
        }
        return result;
    }

    async resolveInternalUrl(path) {
        try {
            var clockUrl = "https://allanime.day" + path;
            var res = await this.client.get(clockUrl, this.getHeaders());
            if (res.statusCode === 200) {
                var data = JSON.parse(res.body);
                if (data.links && data.links.length > 0) {
                    return data.links[0].link || "";
                }
            }
        } catch (e) {
            console.log("resolveInternalUrl error: " + e);
        }
        return "";
    }

    // Updated: Sorts videos by preferred server, then by preferred quality, then by resolution descending
    sortVideos(videos) {
        var prefServer = this.getPreferredServer().toLowerCase();
        var prefQuality = this.getPreferredQuality();
        
        videos.sort((a, b) => {
            // 1. Prioritize Preferred Server
            var aServerMatch = a.quality.toLowerCase().includes(prefServer) ? 1 : 0;
            var bServerMatch = b.quality.toLowerCase().includes(prefServer) ? 1 : 0;
            
            if (aServerMatch !== bServerMatch) {
                return bServerMatch - aServerMatch; 
            }

            // 2. Prioritize Preferred Quality (if servers match)
            var aQualityMatch = a.quality.includes(prefQuality) ? 1 : 0;
            var bQualityMatch = b.quality.includes(prefQuality) ? 1 : 0;

            if (aQualityMatch !== bQualityMatch) {
                return bQualityMatch - aQualityMatch;
            }

            // 3. Fallback: Sort by raw resolution number descending
            var regex = /(\d+)p/;
            var matchA = a.quality.match(regex);
            var matchB = b.quality.match(regex);
            var numA = matchA ? parseInt(matchA[1]) : 0;
            var numB = matchB ? parseInt(matchB[1]) : 0;

            return numB - numA;
        });
        
        return videos;
    }

    async getVideoList(url) {
        console.log("AllManga getVideoList: " + url);
        try {
            var parts = url.split("||");
            if (parts.length < 3) {
                console.log("Invalid episode URL format");
                return [];
            }
            var showId = parts[0];
            var translationType = parts[1];
            var episodeString = parts[2];

            var epQuery = "query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode( showId: $showId translationType: $translationType episodeString: $episodeString ) { episodeString sourceUrls } }";
            var epData = await this.gqlGet(epQuery, {
                showId: showId,
                translationType: translationType,
                episodeString: episodeString
            });

            var episode = epData.data.episode;
            if (!episode || !episode.sourceUrls) {
                console.log("No source URLs found");
                return [];
            }

            var videos = [];
            for (var sourceObj of episode.sourceUrls) {
                try {
                    var rawUrl = sourceObj.sourceUrl || "";
                    var sourceName = sourceObj.sourceName || "Unknown";

                    if (!rawUrl) continue;

                    var resolvedUrl = rawUrl;

                    if (rawUrl.startsWith("--")) {
                        resolvedUrl = this.xorDecode(rawUrl.substring(2));
                    } else if (rawUrl.startsWith("/")) {
                        resolvedUrl = await this.resolveInternalUrl(rawUrl);
                    }

                    if (!resolvedUrl) continue;

                    console.log("Source: " + sourceName + " -> " + resolvedUrl);

                    if (resolvedUrl.includes(".m3u8")) {
                        videos.push({
                            url: resolvedUrl,
                            originalUrl: resolvedUrl,
                            quality: sourceName + " - HLS",
                            headers: this.getHeaders()
                        });
                    } else if (resolvedUrl.includes(".mp4")) {
                        videos.push({
                            url: resolvedUrl,
                            originalUrl: resolvedUrl,
                            quality: sourceName + " - MP4",
                            headers: this.getHeaders()
                        });
                    } else {
                        videos.push({
                            url: resolvedUrl,
                            originalUrl: resolvedUrl,
                            quality: sourceName,
                            headers: this.getHeaders()
                        });
                    }
                } catch (srcErr) {
                    console.log("Source parse error: " + srcErr);
                }
            }

            console.log("Total videos: " + videos.length);
            
            return this.sortVideos(videos);
            
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

    // Updated: Added Preferred Quality to the list preference settings
    getSourcePreferences() {
        return [
            {
                key: "title_lang",
                listPreference: {
                    title: "Title Language",
                    summary: "Preferred title language",
                    valueIndex: 0,
                    entries: ["English", "Romaji", "Native"],
                    entryValues: ["english", "romaji", "native"]
                }
            },
            {
                key: "stream_type",
                listPreference: {
                    title: "Stream Type",
                    summary: "Preferred stream type (Sub or Dub)",
                    valueIndex: 0,
                    entries: ["Sub", "Dub"],
                    entryValues: ["sub", "dub"]
                }
            },
            {
                key: "preferred_server",
                listPreference: {
                    title: "Preferred Server",
                    summary: "Select your preferred server",
                    valueIndex: 0,
                    entries: ["Yt-mp4", "Luf-mp4", "Vidstreaming", "Ok.ru"],
                    entryValues: ["yt-mp4", "luf-mp4", "vidstreaming", "ok.ru"]
                }
            },
            {
                key: "preferred_quality",
                listPreference: {
                    title: "Preferred Quality",
                    summary: "Select your preferred video resolution",
                    valueIndex: 0, // Default to 1080p
                    entries: ["1080p", "720p", "480p", "360p"],
                    entryValues: ["1080", "720", "480", "360"]
                }
            }
        ];
    }
}
