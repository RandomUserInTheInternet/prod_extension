# 🕷️ Scrapling Extension Research Guide

> **AI INSTRUCTION**: When told `"read SCRAPLING_GUIDE.md then create an extension for <URL>"`, follow every phase below in order. Do NOT skip phases. Run all Python scripts with `python scratch_SITENAME.py` before writing any JS.

---

## ⚙️ Setup (already installed)

```bash
pip install scrapling[all]
```

Fetcher decision tree:
- Static HTML → `Fetcher`
- JS-rendered / needs real browser → `PlayWrightFetcher`  
- Cloudflare / heavy bot protection → `StealthyFetcher`

> **BROWSER INTERACTION**: If you need to physically open a browser to inspect elements, trace network requests, or handle complex bypasses interactively, **always use the `chrome-devtools-mcp` tools** (e.g., `mcp_chrome-devtools-mcp_new_page`, `mcp_chrome-devtools-mcp_take_screenshot`, etc.) instead of writing a local Selenium/Playwright script to do it.

---

## 📋 PHASE 1 — Reconnaissance (Python)

Create `scratch_SITENAME.py` in workspace root. Run it. Delete when done.

### 1A — Detect site type & test basic fetch

```python
from scrapling.fetchers import Fetcher, StealthyFetcher
import json, re

BASE = 'https://TARGET-SITE.com'

# Try basic fetch first
page = Fetcher().get(BASE)
print('Status:', page.status)
print('Has Cloudflare:', 'cloudflare' in page.html.lower() or page.status == 403)
print('HTML sample:', page.html[:1000])
```

If status != 200 or Cloudflare detected, switch to:
```python
page = StealthyFetcher().fetch(BASE, block_images=True, network_idle=True)
```

### 1B — Scrape Popular / Latest listing pages

```python
# Try common listing URL patterns
for url in [
    BASE + '/',
    BASE + '/most-viewed',
    BASE + '/popular',
    BASE + '/latest-updated',
    BASE + '/recently-updated',
]:
    p = Fetcher().get(url)
    print(url, '->', p.status)

# Find anime cards — look for links containing /anime/ or /watch/
cards = page.css('a[href*="/anime/"], a[href*="/watch/"]')
for c in cards[:5]:
    print('href:', c.attrib.get('href'))
    print('text:', c.css('::text').get())
    img = c.css('img')
    print('img src:', img.attrib.get('src') or img.attrib.get('data-src') if img else None)

# Check pagination
print('Has pagination:', bool(page.css('a[href*="page="], .pagination, nav')))
# Check for JSON API (SvelteKit sites append /__data.json)
api = Fetcher().get(url + '/__data.json')
print('__data.json status:', api.status)
```

### 1C — Search endpoint discovery

```python
query = 'one piece'
search_attempts = [
    f'{BASE}/?s={query.replace(" ","+")}',
    f'{BASE}/search?q={query.replace(" ","+")}',
    f'{BASE}/filter?keyword={query.replace(" ","+")}',
    f'{BASE}/search/__data.json?q={query.replace(" ","+")}',
    f'{BASE}/api?m=search&q={query.replace(" ","+")}',
]
for u in search_attempts:
    r = Fetcher().get(u)
    print(u, '->', r.status, len(r.html))
```

### 1D — Detail page & data-id / session key

```python
# Use a known anime slug/path from step 1B
detail = Fetcher().get(f'{BASE}/anime/SLUG-HERE')
doc = detail

# Get title
print('OG title:', doc.css('meta[property="og:title"]').attrib.get('content',''))
print('H1:', doc.css('h1::text').get())

# Get image
print('OG image:', doc.css('meta[property="og:image"]').attrib.get('content',''))
print('poster img:', doc.css('.poster img, .anime-poster img').attrib.get('src',''))

# Get description
print('desc:', doc.css('meta[property="og:description"]').attrib.get('content',''))

# Get genres
for g in doc.css('a[href*="/genre/"]'):
    print('genre:', g.css('::text').get())

# Critical: find data-id for AJAX episode fetching
import re
data_ids = re.findall(r'data-id=["\'](\d+)["\']', detail.html)
print('data-ids found:', data_ids)

# Also check for session tokens (AnimePahe style)
sessions = re.findall(r'["\']session["\']\s*:\s*["\']([a-f0-9-]{30,})["\']', detail.html)
print('sessions found:', sessions)
```

### 1E — Episode list endpoint discovery

```python
# Pattern A: AJAX with data-id (AnikotoTV style)
if data_ids:
    data_id = data_ids[0]
    ajax_headers = {'X-Requested-With': 'XMLHttpRequest', 'Referer': BASE + '/'}
    
    for ep_endpoint in [
        f'{BASE}/ajax/episode/list/{data_id}',
        f'{BASE}/ajax/v2/episode/list/{data_id}',
        f'{BASE}/api/watch/{data_id}/1',
    ]:
        r = Fetcher().get(ep_endpoint, headers=ajax_headers)
        print(ep_endpoint, '->', r.status)
        if r.status == 200:
            try:
                d = json.loads(r.content)
                print('JSON keys:', list(d.keys()) if isinstance(d, dict) else 'array len=' + str(len(d)))
                print(str(d)[:500])
            except:
                print('Raw HTML:', r.html[:500])

# Pattern B: Paginated API (AnimePahe style)
if sessions:
    session = sessions[0]
    r = Fetcher().get(f'{BASE}/api?m=release&id={session}&sort=episode_desc&page=1',
                      headers={'X-Requested-With': 'XMLHttpRequest'})
    print(json.loads(r.content))

# Pattern C: SvelteKit __data.json
r = Fetcher().get(f'{BASE}/anime/SLUG/__data.json')
if r.status == 200:
    print('SvelteKit data found')
    print(r.html[:1000])
```

### 1F — Server list & stream URL discovery

```python
# After finding episode dataIds/session from 1E:

# Pattern A: server list then source URL (AnikotoTV style)
data_ids_str = 'IDs-FROM-EPISODE-LIST'
ajax_headers = {'X-Requested-With': 'XMLHttpRequest', 'Referer': BASE + '/'}

servers_r = Fetcher().get(
    f'{BASE}/ajax/server/list?servers={data_ids_str}',
    headers=ajax_headers
)
server_data = json.loads(servers_r.content)
print('Server HTML:', server_data.get('result','')[:500])

# Extract link-ids from server HTML
link_ids = re.findall(r'data-link-id=["\']([^"\']+)["\']', server_data.get('result',''))
print('Link IDs:', link_ids)

for link_id in link_ids[:3]:
    src = Fetcher().get(f'{BASE}/ajax/server?get={link_id}', headers=ajax_headers)
    d = json.loads(src.content)
    print('Embed URL:', d.get('result',{}).get('url',''))

# Pattern B: links API (AnimePahe style)
ep_session = 'EP-SESSION-ID'
links = Fetcher().get(f'{BASE}/api?m=links&id={ep_session}&p=kwik',
                      headers={'X-Requested-With': 'XMLHttpRequest'})
print(json.loads(links.content))

# Pattern C: direct API response with episode_links array
r = Fetcher().get(f'{BASE}/api/watch/ANIME-ID/EP-NUM')
d = json.loads(r.content)
print('episode_links:', d.get('episode_links', []))
```

### 1G — Embed / stream extraction

```python
embed_url = 'EMBED-URL-FROM-1F'

embed = Fetcher().get(embed_url, headers={'Referer': BASE + '/'})

# Direct m3u8
m3u8 = re.findall(r'https?://[^\'"\\s]+\.m3u8[^\'"\\s]*', embed.html)
print('Direct m3u8:', m3u8)

# Packed JS (p,a,c,k) — use StealthyFetcher to get unpacked version
# or extract and manually identify m3u8 pattern
packed = re.findall(r'eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(\'\|\'\)[\s\S]*?\)\)', embed.html)
print('Packed JS blocks found:', len(packed))

# JSON blobs containing sources/file keys
scripts = embed.css('script')
for s in scripts:
    t = s.css('::text').get() or ''
    if any(k in t for k in ['sources','\"file\"','m3u8','hls']):
        print('Relevant script:', t[:300])
```

---

## 📋 PHASE 2 — Document Findings

After Phase 1, note down:

| Item | Value |
|---|---|
| Fetcher needed | `Fetcher` / `StealthyFetcher` |
| Popular URL | e.g. `/most-viewed?page={page}` |
| Latest URL | e.g. `/recently-updated?page={page}` |
| Search URL | e.g. `/filter?keyword={q}&page={page}` |
| Card selector | e.g. `a[href*="/watch/"]` |
| Link format stored as | e.g. slug only: `naruto-abc123` |
| Detail page URL | e.g. `/anime/{slug}` |
| Episode list endpoint | e.g. `/ajax/episode/list/{data-id}` |
| Server list endpoint | e.g. `/ajax/server/list?servers={dataIds}` |
| Source endpoint | e.g. `/ajax/server?get={linkId}` |
| Embed player type | Kwik / ZenCloudz / direct m3u8 / iframe |
| hasCloudflare | true / false |

---

## 📋 PHASE 3 — Write the JS Extension

### File location
```
javascript/anime/src/en/SITENAME.js
```

### Full extension template

```javascript
const mangayomiSources = [{
    "name": "SiteName",
    "lang": "en",
    "baseUrl": "https://TARGET-SITE.com",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=TARGET-SITE.com",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "0.0.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": true,         // ← set from Phase 2
    "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/prod_extension/main/javascript/anime/src/en/SITENAME.js",
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "id": RANDOM_9_DIGIT_NUMBER,   // ← generate a unique random integer
    "notes": "SiteName - brief description",
    "pkgPath": "anime/src/en/SITENAME.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.baseUrl = "https://TARGET-SITE.com";
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": this.baseUrl + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    // ── Parse anime cards from listing/search HTML ────────────────────────────
    // Adapt selectors based on Phase 2 findings
    parseAnimeList(html) {
        var list = [];
        var seen = new Set();
        // Adjust regex to match the link pattern found in Phase 1B
        var cardRegex = /href=["'](?:https?:\/\/[^\/]+)?\/(?:anime|watch)\/([^"'\/\?]+)[^"']*["'][^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
        var m;
        while ((m = cardRegex.exec(html)) !== null) {
            var slug = m[1];
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);
            list.push({ name: m[3].trim(), imageUrl: m[2], link: slug });
        }
        return list;
    }

    async fetchListing(url) {
        try {
            var res = await this.client.get(url, this.getHeaders());
            if (res.statusCode !== 200) return { list: [], hasNextPage: false };
            var list = this.parseAnimeList(res.body);
            var hasNextPage = /href="[^"]*page=\d+[^"]*"/.test(res.body);
            return { list, hasNextPage };
        } catch(e) {
            console.log("fetchListing error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getPopular(page) {
        // ← Update URL pattern from Phase 2
        var url = this.baseUrl + "/most-viewed" + (page > 1 ? "?page=" + page : "");
        return await this.fetchListing(url);
    }

    async getLatestUpdates(page) {
        // ← Update URL pattern from Phase 2
        var url = this.baseUrl + "/recently-updated" + (page > 1 ? "?page=" + page : "");
        return await this.fetchListing(url);
    }

    async search(query, page, filters) {
        // ← Update URL pattern from Phase 2
        var url = this.baseUrl + "/filter?keyword=" + encodeURIComponent(query) + (page > 1 ? "&page=" + page : "");
        return await this.fetchListing(url);
    }

    // ── getDetail ─────────────────────────────────────────────────────────────
    // url = slug stored in link field from parseAnimeList
    async getDetail(url) {
        var slug = url;
        var name = slug.replace(/-[a-z0-9]{4,6}$/, "").replace(/-/g, " ");
        var imageUrl = "", description = "", genre = [], status = 5, chapters = [];

        try {
            var ajaxHeaders = Object.assign({}, this.getHeaders(), { "X-Requested-With": "XMLHttpRequest" });

            // Fetch detail page
            var res = await this.client.get(this.baseUrl + "/anime/" + slug, this.getHeaders());
            var html = res.body;

            // Title
            var t = html.match(/meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
            if (t) name = t[1].replace(/\s*[-|].*site.*$/i, "").trim();

            // Image
            var img = html.match(/meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            if (img) imageUrl = img[1];

            // Description
            var desc = html.match(/meta[^>]+(?:property=["']og:description["']|name=["']description["'])[^>]+content=["']([^"']+)["']/i);
            if (desc) description = desc[1].trim();

            // Genres
            var gm, genreRx = /href=["']\/genre\/[^"'\/]+["'][^>]*>([^<]+)</gi;
            while ((gm = genreRx.exec(html)) !== null) genre.push(gm[1].trim());

            // Status
            if (/finished|completed/i.test(html)) status = 1;
            else if (/ongoing|airing/i.test(html)) status = 0;

            // ── Episode list via AJAX (Pattern A — adjust to findings) ────────
            var dataIdMatch = html.match(/data-id=["'](\d+)["']/);
            if (dataIdMatch) {
                var animeId = dataIdMatch[1];
                var listRes = await this.client.get(
                    this.baseUrl + "/ajax/episode/list/" + animeId, ajaxHeaders
                );
                if (listRes.statusCode === 200) {
                    var listData;
                    try { listData = JSON.parse(listRes.body).result; } catch(e) { listData = listRes.body; }
                    var epRx = /data-num=["'](\d+)["'][^>]*data-ids=["']([^"']+)["']/gi;
                    var em, seen2 = new Set();
                    while ((em = epRx.exec(listData)) !== null) {
                        var n = parseInt(em[1], 10);
                        if (!seen2.has(n)) {
                            seen2.add(n);
                            chapters.push({ name: "Episode " + n, url: slug + "||" + n + "||" + em[2] });
                        }
                    }
                }
            }

            if (chapters.length === 0) chapters.push({ name: "Episode 1", url: slug + "||1||" });
            chapters.sort((a, b) => parseInt(a.url.split("||")[1]||0) - parseInt(b.url.split("||")[1]||0));

        } catch(e) { console.log("getDetail error: " + e); }

        return { name, imageUrl, description, genre, status, chapters };
    }

    // ── getVideoList ──────────────────────────────────────────────────────────
    // url format depends on what was stored in chapters[].url during getDetail
    async getVideoList(url) {
        var parts = url.split("||");
        var slug = parts[0], epNum = parts[1] || "1", cachedDataIds = parts[2] || "";
        var videos = [];

        try {
            var ajaxHeaders = Object.assign({}, this.getHeaders(), { "X-Requested-With": "XMLHttpRequest" });

            // ── Pattern A: server list → source URL (adjust to findings) ──────
            if (cachedDataIds) {
                var serverListRes = await this.client.get(
                    this.baseUrl + "/ajax/server/list?servers=" + encodeURIComponent(cachedDataIds),
                    ajaxHeaders
                );
                var serverHtml;
                try { serverHtml = JSON.parse(serverListRes.body).result; } catch(e) { serverHtml = serverListRes.body; }

                var linkRx = /data-link-id=["']([^"']+)["'][^>]*>([^<]+)<\/li>/gi;
                var lm;
                while ((lm = linkRx.exec(serverHtml)) !== null) {
                    try {
                        var srcRes = await this.client.get(
                            this.baseUrl + "/ajax/server?get=" + lm[1], ajaxHeaders
                        );
                        var d = JSON.parse(srcRes.body);
                        if (d.result && d.result.url) {
                            videos.push({
                                url: d.result.url,
                                originalUrl: d.result.url,
                                quality: "Embed - " + lm[2].trim(),
                                headers: { "Referer": this.baseUrl + "/" }
                            });
                        }
                    } catch(err) {}
                }
            }

        } catch(e) { console.log("getVideoList error: " + e); }

        return videos;
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() {
        return [{
            key: "stream_type",
            listPreference: {
                title: "Stream Type",
                summary: "Sub or Dub",
                valueIndex: 0,
                entries: ["Sub", "Dub"],
                entryValues: ["sub", "dub"]
            }
        }];
    }
}
```

---

## 📋 PHASE 4 — Register in index.json

Add an entry to `anime_index.json` (or `index.json` under the anime section):

```json
{
  "name": "SiteName",
  "lang": "en",
  "baseUrl": "https://TARGET-SITE.com",
  "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=TARGET-SITE.com",
  "typeSource": "single",
  "isManga": false,
  "itemType": 1,
  "version": "0.0.1",
  "hasCloudflare": true,
  "sourceCodeUrl": "https://raw.githubusercontent.com/RandomUserInTheInternet/prod_extension/main/javascript/anime/src/en/SITENAME.js",
  "isFullData": false,
  "appMinVerReq": "0.5.0",
  "sourceCodeLanguage": 1,
  "id": SAME_ID_AS_IN_JS,
  "pkgPath": "anime/src/en/SITENAME.js"
}
```

---

## 📋 PHASE 5 — Verify

Run verification scripts:
```bash
node test_search.js     # test getPopular / search
node test_detail.js     # test getDetail
```

Check that:
- [ ] `getPopular` returns ≥5 items with names, imageUrls, links
- [ ] `search("one piece")` returns relevant results
- [ ] `getDetail(slug)` returns title, image, description, and ≥1 episode
- [ ] `getVideoList(episodeUrl)` returns ≥1 video with a url

---

## 🧩 Mangayomi JS API Quick Reference

```javascript
// HTTP
var res = await this.client.get(url, headersObject);
var res = await this.client.post(url, headersObject, bodyObject);
res.statusCode   // integer
res.body         // string

// DOM (use when regex is insufficient)
var doc = new Document(html);
doc.selectFirst("h1 span").text
doc.selectFirst("img.poster").attr("src")
doc.select("a.genre").map(el => el.text)

// Crypto helpers (built-in)
unpackJs(packedCode)                        // decode p,a,c,k — NOTE: can crash; use manualUnpack() instead
decryptAESCryptoJS(encrypted, passphrase)
encryptAESCryptoJS(plain, passphrase)
cryptoHandler(text, iv, key, encrypt)

// Preferences
var pref = new SharedPreferences().get("key");
```

---

## ⚠️ Common Gotchas

| Problem | Fix |
|---|---|
| `unpackJs()` crashes | Implement `manualUnpack()` in pure JS (see `animepahe.js`) |
| Cloudflare 403 | Set `hasCloudflare: true`; use `StealthyFetcher` for research |
| Images use `data-src` not `src` | Check both attributes in regex/selectors |
| Episodes out of order | Always `.sort()` chapters by episode number |
| SvelteKit site | Try `/__data.json` on every URL; use `unflatten()` helper (see `kuudere.js`) |
| Encrypted m3u8 | Check embed page for AES key/IV in script tags or separate API call |
| AJAX needs session cookie | Hit homepage first with same `Fetcher` instance to capture cookies |
