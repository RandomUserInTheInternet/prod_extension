// ============================================================================
// Mangayomi Anime Extension Template
// ============================================================================
// This template provides a complete structure for creating anime/video 
// streaming extensions for Mangayomi.
//
// INSTRUCTIONS:
// 1. Replace all placeholder values (marked with TODO comments)
// 2. Implement the required methods with your site-specific logic
// 3. Test each method using Mangayomi's built-in editor
// 4. Adjust selectors and parsing logic based on your target site's HTML
// ============================================================================

// Extension metadata configuration
const mangayomiSources = [{
    "name": "Your Extension Name",              // TODO: Change to your extension name
    "lang": "en",                               // TODO: Change to language code (en, es, fr, etc.)
    "baseUrl": "https://example.com",           // TODO: Change to site's base URL
    "apiUrl": "",                               // Optional: API URL if site uses one
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=example.com", // TODO: Update domain
    "typeSource": "single",                     // Usually "single" for most extensions
    "isManga": false,                           // false for anime, true for manga
    "itemType": 1,                              // 1 for anime/video content
    "version": "0.1.0",                         // Start with 0.1.0, increment on changes
    "dateFormat": "",                           // Optional: date format if needed
    "dateFormatLocale": "",                     // Optional: locale for dates
    "isNsfw": false,                            // TODO: Set true if content is 18+
    "pkgPath": "anime/src/en/yourextension.js"  // TODO: Update path to match your file
}];

// Main extension class that extends MProvider
class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.baseUrl = "https://example.com";   // TODO: Change to site's base URL
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================
    
    /**
     * Get preference value from storage
     * Useful for user-configurable settings
     */
    getPreference(key) {
        return new SharedPreferences().get(key);
    }

    /**
     * Get HTTP headers for requests
     * Customize based on site requirements
     */
    getHeaders() {
        return {
            "Referer": "https://example.com/",  // TODO: Update to your site
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.48 Safari/537.36"
        };
    }

    /**
     * Make HTTP GET request and return Document object
     * Use for HTML parsing
     */
    async request(url) {
        const res = await this.client.get(url, this.getHeaders());
        return new Document(res.body);
    }

    /**
     * Make HTTP GET request and return raw HTML string
     * Use when you need the raw response body
     */
    async requestRaw(url) {
        const res = await this.client.get(url, this.getHeaders());
        return res.body;
    }

    /**
     * Extract anime slug/ID from URL
     * Customize based on your site's URL structure
     * Example: "https://site.com/watch?id=anime-123" -> "anime-123"
     */
    getSlugFromUrl(url) {
        try {
            // TODO: Implement URL parsing logic for your site
            // Example patterns:
            // - URL parameters: url.split("?id=")[1].split("&")[0]
            // - Path segments: url.split("/").pop()
            // - After domain: url.replace(this.baseUrl, "").split("/")[1]
            
            if (url.includes("?id=")) {
                return url.split("?id=")[1].split("&")[0];
            }
        } catch (e) {
            console.log("Error parsing slug: " + e);
        }
        return "";
    }

    /**
     * Get base anime name without episode number
     * Example: "anime-name-episode-5" -> "anime-name"
     */
    getBaseAnimeName(slug) {
        const parts = slug.split("-");
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            // Check if last part is a number (episode number)
            if (/^\d+$/.test(lastPart)) {
                return parts.slice(0, -1).join("-");
            }
        }
        return slug;
    }

    /**
     * Fix URLs missing protocol
     * Handles cases like "://domain.com" or "/path"
     */
    fixUrl(url) {
        if (!url.startsWith("http")) {
            if (url.startsWith("://")) {
                return "https" + url;
            } else if (url.startsWith("/")) {
                return this.baseUrl + url;
            } else {
                return this.baseUrl + "/" + url;
            }
        }
        return url;
    }

    // ========================================================================
    // Required Methods - Browse and Search
    // ========================================================================

    /**
     * Get popular anime list
     * Called when user browses the source
     * 
     * @param {number} page - Page number (starts at 1)
     * @returns {Promise<{list: Array, hasNextPage: boolean}>}
     */
    async getPopular(page) {
        // TODO: Construct URL for popular anime page
        const url = `${this.baseUrl}/popular?page=${page}`;
        
        try {
            console.log("Fetching popular: " + url);
            const doc = await this.request(url);
            const list = [];
            
            // TODO: Update selector to match your site's HTML structure
            // Common patterns:
            // - "div.anime-card"
            // - ".grid-item"
            // - "article.anime"
            const elements = doc.select("div.anime-item");
            console.log("Found elements: " + elements.length);
            
            for (const element of elements) {
                try {
                    // TODO: Update selectors based on site's HTML
                    const linkElement = element.selectFirst("a");
                    let link = linkElement?.attr("href") || linkElement?.getHref || "";
                    
                    // TODO: Clean up link if needed
                    // Example: Remove query parameters, make absolute, etc.
                    if (!link.startsWith("http")) {
                        link = this.baseUrl + link;
                    }
                    
                    // TODO: Update selector for anime title
                    const name = element.selectFirst(".title, h3, h4, .anime-title")?.text?.trim() || "";
                    
                    // TODO: Update selector for anime image
                    // Common attributes: src, data-src, data-lazy
                    const imageUrl = element.selectFirst("img")?.getSrc || 
                                    element.selectFirst("img")?.attr("src") ||
                                    element.selectFirst("img")?.attr("data-src") || "";
                    
                    if (name && link) {
                        list.push({ name, imageUrl, link });
                        console.log("Added: " + name);
                    }
                } catch (e) {
                    console.log("Element error: " + e);
                    continue;
                }
            }
            
            // TODO: Determine if there are more pages
            // Methods:
            // - Check list length: list.length >= expectedItemsPerPage
            // - Look for "next" button: doc.selectFirst(".next-page, .pagination .next")
            // - Check page parameter in URL
            const hasNextPage = list.length >= 24; // Adjust based on site's pagination
            console.log("Total items: " + list.length);
            
            return { list, hasNextPage };
        } catch (e) {
            console.log("getPopular error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    /**
     * Get latest anime updates
     * Similar to getPopular but sorted by update time
     * 
     * @param {number} page - Page number (starts at 1)
     * @returns {Promise<{list: Array, hasNextPage: boolean}>}
     */
    async getLatestUpdates(page) {
        // TODO: Construct URL for latest updates page
        const url = `${this.baseUrl}/latest?page=${page}`;
        
        try {
            console.log("Fetching latest: " + url);
            const doc = await this.request(url);
            const list = [];
            
            // TODO: Same parsing logic as getPopular
            const elements = doc.select("div.anime-item");
            console.log("Found elements: " + elements.length);
            
            for (const element of elements) {
                try {
                    const linkElement = element.selectFirst("a");
                    let link = linkElement?.attr("href") || linkElement?.getHref || "";
                    
                    if (!link.startsWith("http")) {
                        link = this.baseUrl + link;
                    }
                    
                    const name = element.selectFirst(".title, h3, h4")?.text?.trim() || "";
                    const imageUrl = element.selectFirst("img")?.getSrc || 
                                    element.selectFirst("img")?.attr("src") ||
                                    element.selectFirst("img")?.attr("data-src") || "";
                    
                    if (name && link) {
                        list.push({ name, imageUrl, link });
                    }
                } catch (e) {
                    continue;
                }
            }
            
            const hasNextPage = list.length >= 24;
            return { list, hasNextPage };
        } catch (e) {
            console.log("getLatestUpdates error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    /**
     * Search for anime
     * 
     * @param {string} query - Search query text
     * @param {number} page - Page number
     * @param {Array} filters - Filter options from getFilterList()
     * @returns {Promise<{list: Array, hasNextPage: boolean}>}
     */
    async search(query, page, filters) {
        // TODO: Process filters if your site supports them
        let order = "recent";
        
        if (filters && filters.length > 0 && filters[0].values) {
            const selectedIndex = filters[0].state || 0;
            order = filters[0].values[selectedIndex]?.value || "recent";
        }
        
        // TODO: Construct search URL
        // Common patterns:
        // - Query string: /search?q=naruto&page=1
        // - Path based: /search/naruto/page/1
        // - API endpoint: /api/search?query=naruto
        const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&order=${order}&page=${page}`;
        
        try {
            console.log("Searching: " + url);
            const doc = await this.request(url);
            const list = [];
            
            // TODO: Same parsing logic as getPopular
            const elements = doc.select("div.anime-item");
            
            for (const element of elements) {
                try {
                    const linkElement = element.selectFirst("a");
                    let link = linkElement?.attr("href") || linkElement?.getHref || "";
                    
                    if (!link.startsWith("http")) {
                        link = this.baseUrl + link;
                    }
                    
                    const name = element.selectFirst(".title, h3, h4")?.text?.trim() || "";
                    const imageUrl = element.selectFirst("img")?.getSrc || 
                                    element.selectFirst("img")?.attr("src") ||
                                    element.selectFirst("img")?.attr("data-src") || "";
                    
                    if (name && link) {
                        list.push({ name, imageUrl, link });
                    }
                } catch (e) {
                    continue;
                }
            }
            
            const hasNextPage = list.length >= 24;
            return { list, hasNextPage };
        } catch (e) {
            console.log("search error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    // ========================================================================
    // Required Methods - Anime Details
    // ========================================================================

    /**
     * Get anime details and episode list
     * Called when user taps on an anime
     * 
     * @param {string} url - Anime page URL
     * @returns {Promise<Object>} Anime details object
     */
    async getDetail(url) {
        let fullUrl = this.fixUrl(url);
        
        try {
            console.log("Getting detail: " + fullUrl);
            const html = await this.requestRaw(fullUrl);
            const doc = new Document(html);
            
            // TODO: Extract anime information
            // Use multiple selectors as fallbacks
            
            // Image URL
            const imageUrl = doc.selectFirst(".poster img, .anime-image, meta[property='og:image']")?.getSrc || 
                            doc.selectFirst("img")?.attr("content") || "";
            
            // Title
            const title = doc.selectFirst("h1, .anime-title, meta[property='og:title']")?.text?.trim() || 
                         doc.selectFirst("meta[property='og:title']")?.attr("content") || "";
            
            // Description/Synopsis
            const description = doc.selectFirst(".description, .synopsis, meta[property='og:description']")?.text?.trim() || 
                               doc.selectFirst("meta[property='og:description']")?.attr("content") || "";
            
            // Genres
            const genreElements = doc.select(".genres a, .genre a, .tags a");
            const genre = [];
            for (const el of genreElements) {
                const g = el.text?.trim();
                if (g) genre.push(g);
            }
            
            // TODO: Get current anime slug for episode matching
            const currentSlug = this.getSlugFromUrl(fullUrl);
            const baseAnimeName = this.getBaseAnimeName(currentSlug);
            console.log("Current slug: " + currentSlug + ", Base name: " + baseAnimeName);
            
            // TODO: Extract episodes
            const chapters = [];
            
            // Common selectors for episode lists:
            // - "div.episode-list div.episode"
            // - ".episodes .episode-item"
            // - "ul.episode-list li"
            const episodeElements = doc.select("div.episode-list div.episode");
            console.log("Found potential episodes: " + episodeElements.length);
            
            for (const element of episodeElements) {
                try {
                    const linkElement = element.selectFirst("a");
                    let episodeUrl = linkElement?.attr("href") || linkElement?.getHref || "";
                    
                    if (!episodeUrl) continue;
                    
                    // Make URL absolute
                    episodeUrl = this.fixUrl(episodeUrl);
                    
                    // TODO: Extract episode number and title
                    // Common patterns:
                    // - Episode number in a span: element.selectFirst(".ep-number")
                    // - Episode title: element.selectFirst(".ep-title")
                    // - From URL: match episode number from URL
                    
                    const epNumber = element.selectFirst(".ep-number, .episode-num")?.text?.trim() || "";
                    const epTitle = element.selectFirst(".ep-title, .episode-title")?.text?.trim() || "";
                    
                    let name = "";
                    if (epNumber) {
                        name = `Episode ${epNumber}`;
                        if (epTitle) name += `: ${epTitle}`;
                    } else if (epTitle) {
                        name = epTitle;
                    } else {
                        // Try to extract from URL
                        const urlEpMatch = episodeUrl.match(/-(\d+)$/);
                        if (urlEpMatch) {
                            name = `Episode ${urlEpMatch[1]}`;
                        } else {
                            name = "Episode";
                        }
                    }
                    
                    // Optional: Filter episodes by matching base name
                    // This prevents wrong episodes from being added
                    const episodeSlug = this.getSlugFromUrl(episodeUrl);
                    const episodeBaseName = this.getBaseAnimeName(episodeSlug);
                    
                    if (!baseAnimeName || !episodeBaseName || 
                        episodeBaseName.toLowerCase() === baseAnimeName.toLowerCase()) {
                        
                        if (!chapters.some(c => c.url === episodeUrl)) {
                            chapters.push({ 
                                name, 
                                url: episodeUrl,
                                dateUpload: null  // Set to timestamp if available
                            });
                            console.log("Added episode: " + name + " -> " + episodeUrl);
                        }
                    }
                } catch (e) {
                    console.log("Episode parsing error: " + e);
                    continue;
                }
            }
            
            // Add current page as episode if not in list
            if (chapters.length === 0) {
                chapters.push({ 
                    name: "Episode 1", 
                    url: fullUrl,
                    dateUpload: null 
                });
            }
            
            // Sort episodes by number
            chapters.sort((a, b) => {
                const numA = parseInt(a.name.match(/\d+/)?.[0] || "0", 10);
                const numB = parseInt(b.name.match(/\d+/)?.[0] || "0", 10);
                return numA - numB;
            });
            
            return {
                title,
                imageUrl,
                description,
                genre,
                author: "",      // Usually not applicable for anime
                artist: "",      // Usually not applicable for anime
                status: 5,       // 0=ongoing, 1=complete, 2=hiatus, 3=canceled, 4=finished, 5=unknown
                chapters
            };
        } catch (e) {
            console.log("getDetail error: " + e);
            return {
                title: "",
                imageUrl: "",
                description: "",
                genre: [],
                author: "",
                artist: "",
                status: 5,
                chapters: [{ name: "Episode 1", url: fullUrl, dateUpload: null }]
            };
        }
    }

    // ========================================================================
    // Required Methods - Video Extraction
    // ========================================================================

    /**
     * Extract video URLs from episode page
     * This is the most complex method - see guide for common patterns
     * 
     * @param {string} url - Episode page URL
     * @returns {Promise<Array>} Array of video objects with url, originalUrl, quality, headers
     */
    async getVideoList(url) {
        let fullUrl = this.fixUrl(url);
        
        console.log("Getting videos for: " + fullUrl);
        
        try {
            const res = await this.client.get(fullUrl, this.getHeaders());
            console.log("Response status: " + res.statusCode);
            
            if (res.statusCode !== 200) {
                console.log("Failed to fetch page, status: " + res.statusCode);
                return [];
            }
            
            const html = res.body;
            const doc = new Document(html);
            const videos = [];
            
            // ================================================================
            // Method 1: Extract from iframes
            // Many sites embed videos in iframes
            // ================================================================
            const iframes = doc.select("iframe[src]");
            console.log("Found iframes: " + iframes.length);
            
            for (const iframe of iframes) {
                const iframeSrc = iframe.attr("src") || iframe.getSrc || "";
                
                // Skip ad iframes
                if (iframeSrc && !iframeSrc.includes("google") && !iframeSrc.includes("ads")) {
                    console.log("Processing iframe: " + iframeSrc);
                    
                    let iframeFullUrl = this.fixUrl(iframeSrc);
                    
                    try {
                        const iframeRes = await this.client.get(iframeFullUrl, {
                            "Referer": fullUrl,
                            "User-Agent": this.getHeaders()["User-Agent"]
                        });
                        
                        if (iframeRes.statusCode === 200) {
                            const iframeHtml = iframeRes.body;
                            
                            // Extract m3u8 URLs from iframe
                            const m3u8Matches = iframeHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
                            for (const m3u8 of m3u8Matches) {
                                if (!videos.some(v => v.url === m3u8)) {
                                    // Try to detect quality from URL
                                    const qualityMatch = m3u8.match(/\/(\d{3,4})[p\/]/);
                                    videos.push({
                                        url: m3u8,
                                        originalUrl: m3u8,
                                        quality: `${qualityMatch ? qualityMatch[1] + 'p' : 'Auto'}`,
                                        headers: { "Referer": iframeFullUrl }
                                    });
                                    console.log("Found m3u8: " + m3u8);
                                }
                            }
                            
                            // Extract mp4 URLs from iframe
                            const mp4Matches = iframeHtml.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/g) || [];
                            for (const mp4 of mp4Matches) {
                                if (!videos.some(v => v.url === mp4)) {
                                    const qualityMatch = mp4.match(/\/(\d{3,4})[p\/]/);
                                    videos.push({
                                        url: mp4,
                                        originalUrl: mp4,
                                        quality: `${qualityMatch ? qualityMatch[1] + 'p' : 'Default'}`,
                                        headers: { "Referer": iframeFullUrl }
                                    });
                                    console.log("Found mp4: " + mp4);
                                }
                            }
                            
                            // ================================================
                            // Method 2: Extract from packed JavaScript
                            // Some sites use eval(function(p,a,c,k,e,d)...)
                            // ================================================
                            if (iframeHtml.includes("eval(function(p,a,c,k,e,d)")) {
                                console.log("Found packed JS in iframe");
                                // Look for escaped URLs in packed JS
                                const packedUrls = iframeHtml.match(/https?:\\\/\\\/[^"']+\.(?:m3u8|mp4)[^"']*/g) || [];
                                for (let packedUrl of packedUrls) {
                                    // Unescape URL
                                    packedUrl = packedUrl.replace(/\\\//g, '/');
                                    if (!videos.some(v => v.url === packedUrl)) {
                                        videos.push({
                                            url: packedUrl,
                                            originalUrl: packedUrl,
                                            quality: "Packed JS",
                                            headers: { "Referer": iframeFullUrl }
                                        });
                                        console.log("Found packed URL: " + packedUrl);
                                    }
                                }
                            }
                        }
                    } catch (iframeErr) {
                        console.log("Iframe fetch error: " + iframeErr);
                    }
                }
            }
            
            // ================================================================
            // Method 3: Extract from main page HTML
            // Videos might be directly in the page source
            // ================================================================
            
            // Search for m3u8 URLs
            const m3u8Regex = /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g;
            const m3u8Matches = html.match(m3u8Regex) || [];
            
            for (const m3u8 of m3u8Matches) {
                if (!videos.some(v => v.url === m3u8)) {
                    videos.push({
                        url: m3u8,
                        originalUrl: m3u8,
                        quality: "HLS",
                        headers: this.getHeaders()
                    });
                    console.log("Found m3u8 in page: " + m3u8);
                }
            }
            
            // Search for mp4 URLs
            const mp4Regex = /https?:\/\/[^\s"']+\.mp4[^\s"']*/g;
            const mp4Matches = html.match(mp4Regex) || [];
            
            for (const mp4 of mp4Matches) {
                if (!videos.some(v => v.url === mp4)) {
                    videos.push({
                        url: mp4,
                        originalUrl: mp4,
                        quality: "MP4",
                        headers: this.getHeaders()
                    });
                    console.log("Found mp4 in page: " + mp4);
                }
            }
            
            // ================================================================
            // Method 4: Extract from <video> tags
            // Some sites use HTML5 video elements
            // ================================================================
            const videoElements = doc.select("video source[src], video[src]");
            for (const video of videoElements) {
                const src = video.attr("src") || "";
                if (src && !videos.some(v => v.url === src)) {
                    videos.push({
                        url: this.fixUrl(src),
                        originalUrl: src,
                        quality: "Direct",
                        headers: this.getHeaders()
                    });
                    console.log("Found video element: " + src);
                }
            }
            
            // ================================================================
            // Method 5: Extract from JavaScript variables
            // Look for video URLs in JS variable declarations
            // ================================================================
            // Example patterns:
            // - var videoUrl = "https://..."
            // - const source = 'https://...'
            // - file:"https://..."
            
            // TODO: Add custom extraction logic based on your site
            // Example:
            // const jsVarMatch = html.match(/videoUrl\s*=\s*["']([^"']+)["']/);
            // if (jsVarMatch) {
            //     videos.push({
            //         url: jsVarMatch[1],
            //         originalUrl: jsVarMatch[1],
            //         quality: "JS Variable",
            //         headers: this.getHeaders()
            //     });
            // }
            
            console.log("Total videos found: " + videos.length);
            return videos;
        } catch (e) {
            console.log("getVideoList error: " + e);
            return [];
        }
    }

    // ========================================================================
    // Required Methods - For Manga (Not Used for Anime)
    // ========================================================================

    /**
     * Get page images for manga chapters
     * Not used for anime extensions - return empty array
     */
    async getPageList(url) {
        return [];
    }

    // ========================================================================
    // Optional Methods - Settings and Filters
    // ========================================================================

    /**
     * Define user preferences/settings
     * Shows up in extension settings in the app
     */
    getSourcePreferences() {
        return [
            {
                key: "overrideBaseUrl",
                editTextPreference: {
                    title: "Override BaseUrl",
                    summary: "Enter the base URL if it has changed",
                    value: "https://example.com",  // TODO: Update
                    dialogTitle: "Override BaseUrl",
                    dialogMessage: "Enter the base URL if it has changed",
                }
            }
            // Add more preferences as needed:
            // {
            //     key: "preferredQuality",
            //     listPreference: {
            //         title: "Preferred Video Quality",
            //         summary: "Select default video quality",
            //         value: "1080p",
            //         values: ["1080p", "720p", "480p"],
            //         entries: ["1080p", "720p", "480p"]
            //     }
            // }
        ];
    }

    /**
     * Define filters for search
     * Allows users to sort/filter search results
     */
    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                name: "Sort By",
                state: 0,  // Default selected index
                values: [
                    { type_name: "SelectOption", name: "Recent", value: "recent" },
                    { type_name: "SelectOption", name: "Popular", value: "popular" },
                    { type_name: "SelectOption", name: "Rating", value: "rating" },
                    { type_name: "SelectOption", name: "A-Z", value: "az" },
                    { type_name: "SelectOption", name: "Z-A", value: "za" },
                ]
            }
            // Other filter types available:
            // - TextFilter: Free text input
            // - CheckBoxFilter: On/off toggle
            // - TriStateFilter: Include/Exclude/None
            // - GroupFilter: Group of filters
        ];
    }
}

// ============================================================================
// CRITICAL: Export the extension instance
// This line MUST be at the end of the file
// ============================================================================
var extension = new DefaultExtension();
