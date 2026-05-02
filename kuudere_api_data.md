# Kuudere.to API Data

Since Kuudere is a SvelteKit application, some of the data (like the Latest Updates and Anime Details) is loaded via SvelteKit's `__data.json` endpoints rather than a traditional REST API when navigating client-side. Additionally, the episodes list and video sources are cleverly bundled together in a single API call on the watch page.

### 1. Homepage / Popular / Trending request URL:
```text
https://kuudere.to/api/top/anime?tab=today&limit=10
```

### 2. Homepage / Latest / Recently Updated request URL:
Since the app uses SvelteKit SSR, the data for the recently updated page is found in its SvelteKit data endpoint:
```text
https://kuudere.to/recently-updated/__data.json
```

### 3. One example JSON response from Popular/Trending:
```json
{
  "success": true,
  "data": [
    {
      "title": "ONE PIECE",
      "image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg",
      "url": "/anime/677f1387001c5de2ba68",
      "stats": {
        "subbed": 1159,
        "dubbed": 1106
      }
    },
    {
      "title": "JUJUTSU KAISEN Season 3: The Culling Game Part 1",
      "image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx172463-LnXqHzt74SJL.jpg",
      "url": "/anime/68b8118c002849f150b1",
      "stats": {
        "subbed": 12,
        "dubbed": 12
      }
    }
  ],
  "tab": "today",
  "limit": 10,
  "total": 10,
  "period": "today"
}
```

### 4. One example JSON response from Latest/Recent:
*Note: SvelteKit's `__data.json` uses an array-based indexing system to minimize payload size. The data for "The Beginning After the End Season 2" is shown below.*
```json
{
  "type": "data",
  "nodes": [
    { "type": "data", "data": [{ "adblockerTokens": 1 }, null], "uses": {} },
    {
      "type": "data",
      "data": [
        { "animeData": 1, "totalResults": 35, "totalPages": 218, "currentPage": 218 },
        [2],
        {
          "id": 3, "english": 4, "romaji": 5, "native": 6, "ageRating": 7, "malScore": 8, "averageScore": 9, "duration": 10, "studios": 11, "genres": 12, "cover": 16, "season": 17, "startDate": 18, "status": 19, "synonyms": 20, "type": 23, "year": 24, "epCount": 25, "subbedCount": 25, "dubbedCount": 26, "description": 27
        },
        "685580760004178ce865", "The Beginning After the End Season 2", "Saikyou no Ousama, Nidome no Jinsei wa Nani wo Suru? 2nd Season", "最強の王様、二度目の人生は 何をする? 第2期", "PG-13", 5.74, 55, 23, [], [13, 14, 15], "Action", "Adventure", "Fantasy", "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx194317-M7t2ymBDHqyW.jpg", "SPRING", "Apr 1, 2026", "RELEASING", [21, 22], "TBATE S2", "Начало после конца 2", "TV", 2026, 5, 3, "The second season of <i>Saikyou no Ousama, Nidome no Jinsei wa Nani wo Suru?</i>\n<br><br>\nArthur faces one last mission with Jasmine, but the quest unleashes a tragedy no one saw coming.\n<br><br>\n(Source: Crunchyoll News)"
      ],
      "uses": { "search_params": ["page"] }
    }
  ]
}
```

### 5. One anime detail page URL from the site:
```text
https://kuudere.to/anime/685580760004178ce865
```

### 6. The XHR request URL used when opening that anime detail page:
Like the Latest page, the anime details are retrieved via SvelteKit's built-in fetcher during client-side navigation:
```text
https://kuudere.to/anime/685580760004178ce865/__data.json
```
*(Alternatively, Kuudere exposes full anime info within the watch endpoint as shown in step #10).*

### 7. The XHR request URL used when episodes load:
Kuudere merges both the episode list and the video sources into a single API endpoint loaded on the watch page:
```text
https://kuudere.to/api/watch/685580760004178ce865/1
```

### 8. One example JSON response from the episodes endpoint:
```json
{
  "all_episodes": [
    {
      "id": "69cd4c1c0018f5b25c7f",
      "titles": [
        "The King Begins Adventuring",
        "王様、冒険する。",
        "Ousama, Bouken suru. "
      ],
      "number": 1,
      "aired": "Apr 1, 2026",
      "score": 3.09,
      "recap": false,
      "filler": false,
      "ago": "8 days ago"
    },
    {
      "id": "69d682f000125fd4a42a",
      "titles": [
        "The Princess Begins Adventuring",
        "王女様、冒険する。",
        "Oujo-sama, Bouken suru. "
      ],
      "number": 2,
      "aired": "Apr 8, 2026",
      "score": 3.16,
      "recap": false,
      "filler": false,
      "ago": "8 days ago"
    }
  ],
  "episode_links": [
    {
      "$id": "zen2_sub_dual_g4sqp",
      "serverId": 0,
      "serverName": "Zen-2",
      "episodeNumber": 1,
      "dataType": "sub",
      "dataLink": "https://zencloudz.cc/e/dfvrueqllxrk?v=2&a=0",
      "continue": true
    }
  ],
  "episode_id": "69cd4c1c0018f5b25c7f",
  "success": true,
  "anime_info": {
    "id": "685580760004178ce865",
    "english": "The Beginning After the End Season 2",
    "romaji": "Saikyou no Ousama, Nidome no Jinsei wa Nani wo Suru? 2nd Season",
    "native": "最強の王様、二度目の人生は 何をする? 第2期",
    "ageRating": "PG-13",
    "malScore": 5.74,
    "epCount": 5,
    "subbedCount": 5,
    "dubbedCount": 3
  }
}
```

### 9. One episode page URL or episode ID:
**Page URL:** `https://kuudere.to/watch/685580760004178ce865/1`
**Episode ID:** `69cd4c1c0018f5b25c7f`

### 10. The XHR request URL used when video sources load:
*Same as the episodes URL.*
```text
https://kuudere.to/api/watch/685580760004178ce865/1
```

### 11. One example JSON response from the video/sources endpoint:
*Because they use the exact same endpoint, the JSON response is identical to the one in step 8. The video sources are found in the `episode_links` array.*
```json
{
  "episode_links": [
    {
      "$id": "zen2_sub_dual_g4sqp",
      "serverId": 0,
      "serverName": "Zen-2",
      "episodeNumber": 1,
      "dataType": "sub",
      "dataLink": "https://zencloudz.cc/e/dfvrueqllxrk?v=2&a=0",
      "continue": true
    },
    {
      "$id": "zen2_dub_dual_0xvvb",
      "serverId": 0,
      "serverName": "Zen-2",
      "episodeNumber": 1,
      "dataType": "dub",
      "dataLink": "https://zencloudz.cc/e/dfvrueqllxrk?v=2&a=1",
      "continue": true
    },
    {
      "$id": "zen_sub_dual_deipi",
      "serverId": 1,
      "serverName": "Zen",
      "episodeNumber": 1,
      "dataType": "sub",
      "dataLink": "https://zencloudz.cc/e/dfvrueqllxrk?v=1&a=0",
      "continue": true
    }
  ]
}
```
