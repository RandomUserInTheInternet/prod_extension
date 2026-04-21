# Mangayomi Extension Development Guide

A comprehensive guide for creating anime/manga extensions for Mangayomi.

## Table of Contents

- [Quick Start](#quick-start)
- [Extension Structure](#extension-structure)
- [Required Methods](#required-methods)
- [Common CSS Selectors](#common-css-selectors)
- [Video Extraction Techniques](#video-extraction-techniques)
- [Common Issues and Fixes](#common-issues-and-fixes)
- [Testing Workflow](#testing-workflow)
- [Deployment](#deployment)
- [Tips and Best Practices](#tips-and-best-practices)

---

## Quick Start

### Prerequisites

- Mangayomi app (desktop or tablet version)
- Basic knowledge of JavaScript and HTML
- Browser developer tools for inspecting websites

### Creating Your First Extension

1. **Open Mangayomi** and go to the Extensions tab
2. **Click the `+` button** to create a new extension
3. **Fill in the metadata:**
   - Name: Your extension name
   - Language: ISO 639-1 code (e.g., "en", "es", "fr")
   - Base URL: The website's main URL
   - Type: Select "Anime" or "Manga"
   - NSFW: Check if content is 18+
4. **Click Save**
5. **Click on your extension** and select "Edit Code"
6. **Start with the template:** Copy from `templates/extension-template-anime.js`
7. **Customize the template** with your site-specific logic
8. **Test each method** using the "Fetch Result" panel

---

## Extension Structure

Every Mangayomi extension consists of two main parts:

### 1. Metadata Configuration

```javascript
const mangayomiSources = [{
    "name": "Your Extension Name",
    "lang": "en",
    "baseUrl": "https://example.com",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=example.com",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.1.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "pkgPath": "anime/src/en/yourextension.js"
}];
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Display name in the app |
| `lang` | String | Yes | ISO 639-1 language code |
| `baseUrl` | String | Yes | Base URL without trailing slash |
| `apiUrl` | String | No | API endpoint if site uses one |
| `iconUrl` | String | Yes | Extension icon URL |
| `typeSource` | String | Yes | Usually "single" |
| `isManga` | Boolean | Yes | false for anime, true for manga |
| `itemType` | Number | Yes | 1 for anime/video, 0 for manga |
| `version` | String | Yes | Semantic version (e.g., "0.1.0") |
| `dateFormat` | String | No | Date format pattern |
| `dateFormatLocale` | String | No | Locale for date parsing |
| `isNsfw` | Boolean | No | true if 18+ content |
| `pkgPath` | String | Yes | File path in repository |

### 2. Extension Class

```javascript
class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.baseUrl = "https://example.com";
    }
    
    // Helper methods
    getHeaders() { /* ... */ }
    request(url) { /* ... */ }
    
    // Required methods
    async getPopular(page) { /* ... */ }
    async getLatestUpdates(page) { /* ... */ }
    async search(query, page, filters) { /* ... */ }
    async getDetail(url) { /* ... */ }
    async getVideoList(url) { /* ... */ }
    
    // Optional methods
    getFilterList() { /* ... */ }
    getSourcePreferences() { /* ... */ }
}

// CRITICAL: Export the extension
var extension = new DefaultExtension();
```

---

## Required Methods

### Browse & Search Methods

#### `getPopular(page)`

Returns popular anime/manga list.

**Parameters:**
- `page` (Number): Page number, starts at 1

**Returns:**
```javascript
{
    list: [
        { name: "Anime Name", imageUrl: "https://...", link: "/anime-link" },
        // ...
    ],
    hasNextPage: true
}
```

**Example:**
```javascript
async getPopular(page) {
    const url = `${this.baseUrl}/popular?page=${page}`;
    const doc = await this.request(url);
    const list = [];
    
    for (const element of doc.select("div.anime-card")) {
        list.push({
            name: element.selectFirst("h3").text.trim(),
            imageUrl: element.selectFirst("img").getSrc,
            link: element.selectFirst("a").attr("href")
        });
    }
    
    return { list, hasNextPage: list.length >= 24 };
}
```

#### `getLatestUpdates(page)`

Returns latest updated anime/manga.

**Similar to `getPopular()`**, but should fetch recently updated content.

#### `search(query, page, filters)`

Searches for anime/manga.

**Parameters:**
- `query` (String): Search text
- `page` (Number): Page number
- `filters` (Array): Filter values from `getFilterList()`

**Example:**
```javascript
async search(query, page, filters) {
    // Process filters
    let order = "recent";
    if (filters && filters.length > 0) {
        order = filters[0].values[filters[0].state].value;
    }
    
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&sort=${order}&page=${page}`;
    // ... rest similar to getPopular
}
```

### Detail Methods

#### `getDetail(url)`

Returns anime/manga details and episode/chapter list.

**Parameters:**
- `url` (String): Anime/manga page URL

**Returns:**
```javascript
{
    title: "Anime Title",
    imageUrl: "https://...",
    description: "Synopsis...",
    genre: ["Action", "Adventure"],
    author: "",  // Usually empty for anime
    artist: "",  // Usually empty for anime
    status: 5,   // 0=ongoing, 1=complete, 2=hiatus, 3=canceled, 4=finished, 5=unknown
    chapters: [  // Or "episodes" for anime
        { name: "Episode 1", url: "/episode-1", dateUpload: null },
        // ...
    ]
}
```

**Example:**
```javascript
async getDetail(url) {
    const doc = await this.request(url);
    
    // Extract details
    const title = doc.selectFirst("h1").text.trim();
    const description = doc.selectFirst(".synopsis").text.trim();
    const imageUrl = doc.selectFirst(".poster img").getSrc;
    
    // Extract genres
    const genre = [];
    for (const el of doc.select(".genre a")) {
        genre.push(el.text.trim());
    }
    
    // Extract episodes
    const chapters = [];
    for (const el of doc.select(".episode-list .episode")) {
        const epNum = el.selectFirst(".ep-number").text.trim();
        chapters.push({
            name: `Episode ${epNum}`,
            url: el.selectFirst("a").attr("href"),
            dateUpload: null
        });
    }
    
    return { title, imageUrl, description, genre, author: "", artist: "", status: 5, chapters };
}
```

### Video Extraction Methods

#### `getVideoList(url)` (For Anime)

Extracts video URLs from episode page.

**Parameters:**
- `url` (String): Episode page URL

**Returns:**
```javascript
[
    {
        url: "https://cdn.com/video.m3u8",
        originalUrl: "https://cdn.com/video.m3u8",
        quality: "1080p",
        headers: { "Referer": "https://..." }
    },
    // ...
]
```

**See [Video Extraction Techniques](#video-extraction-techniques) section for detailed patterns.**

#### `getPageList(url)` (For Manga)

Extracts page images from chapter.

**For anime extensions, return empty array:**
```javascript
async getPageList(url) {
    return [];
}
```

### Optional Methods

#### `getFilterList()`

Defines search filters.

**Returns:**
```javascript
[
    {
        type_name: "SelectFilter",
        name: "Sort By",
        state: 0,
        values: [
            { type_name: "SelectOption", name: "Recent", value: "recent" },
            { type_name: "SelectOption", name: "Popular", value: "popular" }
        ]
    }
]
```

**Available filter types:**
- `SelectFilter`: Dropdown menu
- `TextFilter`: Text input
- `CheckBoxFilter`: Checkbox toggle
- `TriStateFilter`: Include/Exclude/None
- `GroupFilter`: Group of filters

#### `getSourcePreferences()`

Defines user settings for the extension.

**Returns:**
```javascript
[
    {
        key: "overrideBaseUrl",
        editTextPreference: {
            title: "Override BaseUrl",
            summary: "Enter the base URL if it has changed",
            value: "https://example.com",
            dialogTitle: "Override BaseUrl",
            dialogMessage: "Enter the base URL if it has changed"
        }
    }
]
```

---

## Common CSS Selectors

### Selecting Elements

Mangayomi uses a DOM selector API similar to jQuery:

```javascript
// Select first matching element
doc.selectFirst("div.anime-card")
doc.selectFirst("h1")
doc.selectFirst("#main-content")

// Select all matching elements
doc.select("div.anime-card")
doc.select(".episode-list .episode")

// Chaining selectors
element.selectFirst("a").attr("href")
element.selectFirst("img").getSrc
element.selectFirst("h3").text.trim()
```

### Common Patterns

| Pattern | Selector | Example |
|---------|----------|---------|
| By class | `.classname` | `.anime-card` |
| By ID | `#id` | `#content` |
| By tag | `tagname` | `div`, `a`, `img` |
| Descendant | `parent child` | `div.card a` |
| Direct child | `parent > child` | `ul > li` |
| Attribute | `[attribute]` | `img[src]` |
| Attribute value | `[attr="value"]` | `a[href="/home"]` |
| Multiple classes | `.class1.class2` | `.anime.featured` |
| Comma (OR) | `selector1, selector2` | `h1, h2, h3` |

### Extracting Data

```javascript
// Text content
element.text                    // Get text
element.text.trim()            // Trim whitespace

// Attributes
element.attr("href")           // Get href attribute
element.attr("data-id")        // Get data attribute
element.getSrc                 // Get src (for images)
element.getHref                // Get href (for links)

// Meta tags
doc.selectFirst("meta[property='og:title']").attr("content")
doc.selectFirst("meta[name='description']").attr("content")
```

### Fallback Selectors

Always use multiple selectors as fallback:

```javascript
const title = doc.selectFirst("h1")?.text?.trim() ||
              doc.selectFirst(".title")?.text?.trim() ||
              doc.selectFirst("meta[property='og:title']")?.attr("content") ||
              "";
```

---

## Video Extraction Techniques

This is the most complex part of anime extension development. Here are common patterns:

### 1. Direct URLs in HTML

Search for video URLs in the page source:

```javascript
const html = await this.requestRaw(url);

// M3U8 streams
const m3u8Regex = /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g;
const m3u8Matches = html.match(m3u8Regex) || [];

for (const m3u8 of m3u8Matches) {
    videos.push({
        url: m3u8,
        originalUrl: m3u8,
        quality: "HLS",
        headers: this.getHeaders()
    });
}

// MP4 videos
const mp4Regex = /https?:\/\/[^\s"']+\.mp4[^\s"']*/g;
const mp4Matches = html.match(mp4Regex) || [];
```

### 2. Iframe Extraction

Many sites embed videos in iframes:

```javascript
const iframes = doc.select("iframe[src]");

for (const iframe of iframes) {
    const iframeSrc = iframe.attr("src");
    
    // Skip ads
    if (iframeSrc.includes("google") || iframeSrc.includes("ads")) continue;
    
    // Fetch iframe content
    const iframeUrl = this.fixUrl(iframeSrc);
    const iframeRes = await this.client.get(iframeUrl, {
        "Referer": url,
        "User-Agent": this.getHeaders()["User-Agent"]
    });
    
    const iframeHtml = iframeRes.body;
    
    // Extract videos from iframe
    const videos = iframeHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
}
```

### 3. Packed JavaScript

Sites often obfuscate video URLs with packed JS:

```javascript
// Look for eval(function(p,a,c,k,e,d)...)
if (html.includes("eval(function(p,a,c,k,e,d)")) {
    console.log("Found packed JS");
    
    // URLs are escaped: https:\/\/domain.com\/video.m3u8
    const packedUrls = html.match(/https?:\\\/\\\/[^"']+\.(?:m3u8|mp4)[^"']*/g) || [];
    
    for (let packedUrl of packedUrls) {
        // Unescape the URL
        packedUrl = packedUrl.replace(/\\\//g, '/');
        videos.push({
            url: packedUrl,
            originalUrl: packedUrl,
            quality: "Packed",
            headers: this.getHeaders()
        });
    }
}
```

### 4. JavaScript Variables

Extract from variable declarations:

```javascript
// Look for: var videoUrl = "https://..."
const jsVarMatch = html.match(/videoUrl\s*=\s*["']([^"']+)["']/);
if (jsVarMatch) {
    videos.push({
        url: jsVarMatch[1],
        originalUrl: jsVarMatch[1],
        quality: "Default",
        headers: this.getHeaders()
    });
}

// Look for: file:"https://..."
const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/);
if (fileMatch) {
    videos.push({ url: fileMatch[1], originalUrl: fileMatch[1], quality: "Default", headers: {} });
}
```

### 5. HTML5 Video Elements

```javascript
const videoElements = doc.select("video source[src], video[src]");

for (const video of videoElements) {
    const src = video.attr("src");
    if (src) {
        videos.push({
            url: this.fixUrl(src),
            originalUrl: src,
            quality: "Direct",
            headers: this.getHeaders()
        });
    }
}
```

### 6. Quality Detection

Try to extract quality information from URLs:

```javascript
// From path: /1080/video.m3u8 or /video-1080p.m3u8
const qualityMatch = url.match(/\/(\d{3,4})[p\/]/);
const quality = qualityMatch ? qualityMatch[1] + 'p' : 'Auto';

videos.push({
    url: url,
    originalUrl: url,
    quality: quality,
    headers: { "Referer": iframeUrl }
});
```

### Important Notes

- Always set proper `Referer` header for video requests
- Avoid duplicate videos by checking `videos.some(v => v.url === newUrl)`
- Test with browser DevTools Network tab to see actual requests
- Some sites require cookies or tokens - check browser requests

---

## Common Issues and Fixes

### Issue 1: 404 Errors

**Problem:** Extension returns 404 errors when fetching pages.

**Causes:**
- Incorrect URL construction
- Missing protocol (http/https)
- Wrong base URL

**Solutions:**
```javascript
// Fix missing protocol
fixUrl(url) {
    if (!url.startsWith("http")) {
        if (url.startsWith("://")) {
            return "https" + url;
        } else if (url.startsWith("/")) {
            return this.baseUrl + url;
        }
    }
    return url;
}

// Always use fixUrl
const fullUrl = this.fixUrl(relativeUrl);
```

### Issue 2: Wrong Episodes Showing

**Problem:** Episodes from different anime appear in the list.

**Cause:** Site's episode list includes related/recommended anime.

**Solution:** Filter episodes by matching base name:

```javascript
// Extract anime slug from URL
getSlugFromUrl(url) {
    if (url.includes("?id=")) {
        return url.split("?id=")[1].split("&")[0];
    }
    return "";
}

// Get anime name without episode number
getBaseAnimeName(slug) {
    const parts = slug.split("-");
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
        return parts.slice(0, -1).join("-");
    }
    return slug;
}

// In getDetail(), filter episodes
const currentSlug = this.getSlugFromUrl(url);
const baseAnimeName = this.getBaseAnimeName(currentSlug);

for (const episodeElement of episodeElements) {
    const episodeUrl = /* extract URL */;
    const episodeSlug = this.getSlugFromUrl(episodeUrl);
    const episodeBaseName = this.getBaseAnimeName(episodeSlug);
    
    // Only add if same anime
    if (episodeBaseName.toLowerCase() === baseAnimeName.toLowerCase()) {
        chapters.push({ name, url: episodeUrl, dateUpload: null });
    }
}
```

### Issue 3: No Videos Found

**Problem:** `getVideoList()` returns empty array.

**Debugging steps:**

1. **Check page loads:**
```javascript
console.log("Response status: " + res.statusCode);
if (res.statusCode !== 200) {
    return [];
}
```

2. **Log HTML content:**
```javascript
console.log("HTML length: " + html.length);
console.log("Contains m3u8: " + html.includes(".m3u8"));
console.log("Contains mp4: " + html.includes(".mp4"));
```

3. **Check iframes:**
```javascript
const iframes = doc.select("iframe[src]");
console.log("Found iframes: " + iframes.length);
for (const iframe of iframes) {
    console.log("Iframe src: " + iframe.attr("src"));
}
```

4. **Inspect with browser DevTools:**
   - Open episode page in browser
   - Open DevTools → Network tab
   - Filter by "m3u8" or "mp4"
   - See which requests load the video
   - Replicate that logic in your extension

### Issue 4: Videos Don't Play

**Problem:** Videos are found but won't play in Mangayomi.

**Causes:**
- Missing `Referer` header
- Incorrect URL format
- DRM/encryption

**Solutions:**
```javascript
// Always include referer
videos.push({
    url: videoUrl,
    originalUrl: videoUrl,
    quality: "1080p",
    headers: { "Referer": pageUrl }  // Critical!
});

// For iframe videos, use iframe URL as referer
headers: { "Referer": iframeUrl }
```

### Issue 5: Duplicate Episodes

**Problem:** Same episode appears multiple times.

**Solution:** Check before adding:

```javascript
if (!chapters.some(c => c.url === episodeUrl)) {
    chapters.push({ name, url: episodeUrl, dateUpload: null });
}
```

### Issue 6: Empty Search Results

**Problem:** Search returns no results even though query is valid.

**Causes:**
- Incorrect URL encoding
- Wrong search endpoint
- Site uses POST instead of GET

**Solutions:**
```javascript
// Properly encode query
const encodedQuery = encodeURIComponent(query);
const url = `${this.baseUrl}/search?q=${encodedQuery}`;

// If site uses POST
const res = await this.client.post(url, headers, {
    query: query,
    page: page
});
```

---

## Testing Workflow

### Using Mangayomi's Built-in Editor

1. **Open extension settings** in Mangayomi
2. **Click "Edit Code"** to open the editor
3. **The editor has 3 panels:**
   - **Code Editor:** Write your extension code
   - **Fetch Result:** Test methods and see results
   - **Console:** View console.log output

### Testing Each Method

#### Test getPopular()

1. In Fetch Result panel, select "Popular"
2. Enter page number (e.g., "1")
3. Click "Fetch"
4. Check results format and content
5. Verify images and links work

#### Test getLatestUpdates()

1. Select "Latest Updates"
2. Enter page number
3. Click "Fetch"
4. Verify results

#### Test search()

1. Select "Search"
2. Enter query (e.g., "naruto")
3. Enter page number
4. Click "Fetch"
5. Check results

#### Test getDetail()

1. Select "Detail"
2. Enter anime URL (from previous test results)
3. Click "Fetch"
4. Verify:
   - Title, image, description are correct
   - Genre list is populated
   - Episodes are listed correctly
   - Episode URLs are valid

#### Test getVideoList()

1. Select "Video List"
2. Enter episode URL (from getDetail results)
3. Click "Fetch"
4. Verify:
   - Video URLs are found
   - Quality labels make sense
   - Try playing videos in the app

### Debugging Tips

**Use console.log extensively:**
```javascript
console.log("Fetching URL: " + url);
console.log("Found elements: " + elements.length);
console.log("Episode name: " + name);
console.log("Video URL: " + videoUrl);
```

**Log response status:**
```javascript
const res = await this.client.get(url, headers);
console.log("Status: " + res.statusCode);
```

**Log HTML snippets:**
```javascript
console.log("HTML preview: " + html.substring(0, 500));
```

**Use browser DevTools alongside:**
- Open target website in browser
- Inspect HTML structure
- Check Network requests
- Test CSS selectors in browser console:
  ```javascript
  document.querySelectorAll("div.anime-card")
  ```

### Common Testing Mistakes

❌ **Not testing with real URLs** - Always test with actual site URLs

❌ **Only testing one anime** - Test with multiple anime to catch edge cases

❌ **Ignoring console errors** - Always check console panel for errors

❌ **Not checking pagination** - Test multiple pages to ensure hasNextPage works

❌ **Skipping video playback** - Always test that videos actually play

✅ **Test incrementally** - Test each method as you implement it

✅ **Test edge cases** - Try anime with special characters, long titles, etc.

✅ **Test all filters** - If you implement filters, test each option

---

## Deployment

### Preparing for Release

1. **Verify all methods work:**
   - getPopular ✓
   - getLatestUpdates ✓
   - search ✓
   - getDetail ✓
   - getVideoList ✓

2. **Remove debug code:**
   - Remove excessive console.log statements
   - Keep important error logs

3. **Update metadata:**
   - Set appropriate version number
   - Verify baseUrl is correct
   - Check isNsfw flag

4. **Add to repository:**
   - Place file in correct directory: `javascript/anime/src/{lang}/{name}.js`
   - Follow naming convention: lowercase, no spaces

### File Structure

```
mangayomi-extensions/
├── javascript/
│   ├── anime/
│   │   └── src/
│   │       ├── en/
│   │       │   ├── oppaistream.js
│   │       │   └── yourextension.js
│   │       ├── es/
│   │       └── ...
│   ├── manga/
│   └── novel/
├── templates/
│   ├── extension-template-anime.js
│   └── EXTENSION-GUIDE.md
└── README.md
```

### Submitting Pull Request

1. Fork the repository
2. Create a branch: `git checkout -b add-{extension-name}`
3. Add your extension file
4. Update anime_index.json (if needed)
5. Commit: `git commit -m "Add {Extension Name} source"`
6. Push: `git push origin add-{extension-name}`
7. Create Pull Request on GitHub

### Version Numbers

Follow semantic versioning:
- `0.1.0` - Initial release
- `0.1.1` - Bug fixes
- `0.2.0` - New features
- `1.0.0` - Stable release

Always increment version when updating extension code.

---

## Tips and Best Practices

### Code Quality

✅ **Use clear variable names:**
```javascript
// Good
const episodeNumber = element.selectFirst(".ep-num").text.trim();

// Bad
const x = element.selectFirst(".ep-num").text.trim();
```

✅ **Handle errors gracefully:**
```javascript
try {
    // Your code
} catch (e) {
    console.log("Error: " + e);
    return []; // or default value
}
```

✅ **Use optional chaining:**
```javascript
const title = element.selectFirst("h1")?.text?.trim() || "";
```

✅ **Avoid hard-coded values:**
```javascript
// Good
const itemsPerPage = 24;
const hasNextPage = list.length >= itemsPerPage;

// Bad
const hasNextPage = list.length >= 24;
```

### Performance

⚡ **Cache common selectors:**
```javascript
const container = doc.selectFirst(".main-content");
const episodes = container.select(".episode");
```

⚡ **Minimize HTTP requests:**
- Don't fetch iframes unnecessarily
- Use regex on HTML when possible

⚡ **Use early returns:**
```javascript
if (res.statusCode !== 200) {
    return [];
}
// Continue with normal flow
```

### Security

🔒 **Validate URLs:**
```javascript
if (!url || typeof url !== 'string') {
    return [];
}
```

🔒 **Sanitize user input:**
```javascript
const safeQuery = encodeURIComponent(query);
```

🔒 **Check for empty results:**
```javascript
if (!elements || elements.length === 0) {
    return { list: [], hasNextPage: false };
}
```

### User Experience

😊 **Provide meaningful quality labels:**
```javascript
// Good
quality: "1080p HD"

// Bad
quality: "source_1"
```

😊 **Include episode titles when available:**
```javascript
name: `Episode ${epNum}: ${epTitle}`
```

😊 **Sort episodes logically:**
```javascript
chapters.sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
    const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
    return numA - numB;
});
```

### Maintenance

🔧 **Document site-specific quirks:**
```javascript
// Site uses "&for=search" parameter that needs to be removed
if (link.includes("&for=search")) {
    link = link.replace("&for=search", "");
}
```

🔧 **Keep baseUrl configurable:**
```javascript
getSourcePreferences() {
    return [{
        key: "overrideBaseUrl",
        editTextPreference: {
            title: "Override BaseUrl",
            // ...
        }
    }];
}
```

🔧 **Log important steps:**
```javascript
console.log("Fetching: " + url);
console.log("Found " + videos.length + " videos");
```

---

## Case Study: Oppai Stream Extension

This extension was built using the patterns described in this guide. Here's how we solved common problems:

### Problem 1: Finding Anime Cards

**Site Structure:**
- Anime cards in `div.in-grid.episode-shown`
- Title in `.title-ep`
- Image in `img` with `src` or `data-src`

**Solution:**
```javascript
const elements = doc.select("div.in-grid.episode-shown");
for (const element of elements) {
    const name = element.selectFirst(".title-ep")?.text?.trim() || "";
    const imageUrl = element.selectFirst("img")?.getSrc || 
                    element.selectFirst("img")?.attr("src") || "";
    const link = element.selectFirst("a")?.attr("href") || "";
    
    list.push({ name, imageUrl, link });
}
```

### Problem 2: Wrong Episodes in List

**Issue:** Episode list showed episodes from other anime.

**Cause:** Site shows "more episodes" section with related anime.

**Solution:** Match base anime names:
```javascript
const currentSlug = this.getAnimeSlugFromUrl(fullUrl);
const baseAnimeName = this.getBaseAnimeName(currentSlug);

for (const episodeElement of episodeElements) {
    const episodeSlug = this.getAnimeSlugFromUrl(episodeUrl);
    const episodeBaseName = this.getBaseAnimeName(episodeSlug);
    
    if (episodeBaseName.toLowerCase() === baseAnimeName.toLowerCase()) {
        chapters.push({ name, url: episodeUrl, dateUpload: null });
    }
}
```

### Problem 3: Extracting Videos

**Site Structure:**
- Videos in iframes
- M3U8 URLs in iframe HTML
- Some URLs in packed JavaScript

**Solution:** Multi-method extraction:
```javascript
// 1. Check iframes
const iframes = doc.select("iframe[src]");
for (const iframe of iframes) {
    const iframeSrc = iframe.attr("src");
    const iframeHtml = await this.requestRaw(iframeSrc);
    
    // 2. Find m3u8 in iframe
    const m3u8s = iframeHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
    
    // 3. Check for packed JS
    if (iframeHtml.includes("eval(function(p,a,c,k,e,d)")) {
        const packedUrls = iframeHtml.match(/https?:\\\/\\\/[^"']+\.m3u8[^"']*/g) || [];
        // Unescape and add
    }
}

// 4. Also check main page
const mainPageVideos = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
```

### Key Learnings

1. **Always use fallback selectors** - Sites change their HTML
2. **Filter episodes carefully** - Prevents wrong content
3. **Test with multiple anime** - Catches edge cases
4. **Check browser DevTools** - See actual network requests
5. **Log everything during development** - Easier debugging

---

## Additional Resources

### Official Documentation

- [Mangayomi GitHub](https://github.com/kodjodevf/mangayomi)
- [Mangayomi Extensions Repo](https://github.com/kodjodevf/mangayomi-extensions)
- [DOM Selector API](https://github.com/kodjodevf/mangayomi/blob/main/lib/eval/javascript/dom_selector.dart)

### Community

- [Discord Server](https://discord.com/invite/EjfBuYahsP) - Get help and ask questions
- [GitHub Issues](https://github.com/kodjodevf/mangayomi-extensions/issues) - Report bugs

### Related Projects

- [Tachiyomi](https://tachiyomi.org/) - Similar manga reader app
- [Aniyomi](https://aniyomi.org/) - Anime fork of Tachiyomi

---

## Conclusion

Creating Mangayomi extensions requires:

1. Understanding the target website's structure
2. Implementing required methods with proper parsing logic
3. Handling errors and edge cases
4. Testing thoroughly with real data
5. Following best practices for maintainability

Start with the template, test incrementally, and don't hesitate to ask for help in the community!

**Happy coding! 🚀**
