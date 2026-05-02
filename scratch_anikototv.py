"""
AniKoto - Find the actual stream source API for megaplay.buzz/vidwish.live
Strategy: Get a fresh embed URL from the current episode list, then probe API endpoints
"""
from scrapling.fetchers import Fetcher
import json, re
from urllib.parse import quote

BASE = 'https://anikototv.to'
HDR = {'X-Requested-With': 'XMLHttpRequest', 'Referer': BASE + '/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

Q = '"'

# Get fresh data-ids from a recent anime
r = Fetcher().get(f'{BASE}/ajax/episode/list/100', headers=HDR)
result = r.json()['result']
ep1 = re.search('data-num=' + Q + '1' + Q + r'[^>]*data-ids=' + Q + '([^"]+)' + Q, result)
data_ids = ep1.group(1)

# Get fresh server link-ids
r2 = Fetcher().get(f'{BASE}/ajax/server/list?servers={quote(data_ids)}', headers=HDR)
server_html = r2.json().get('result', '')
link_ids = re.findall('data-link-id=' + Q + '([^"]+)' + Q + r'[^>]*>([^<]+)</li>', server_html)
print(f"Servers: {[(s, n.strip()) for s,n in link_ids]}")

# Get fresh embed URL
embed_url = None
for lid, sname in link_ids:
    r3 = Fetcher().get(f'{BASE}/ajax/server?get={lid}', headers=HDR)
    embed = r3.json().get('result', {}).get('url', '')
    print(f"{sname.strip()}: {embed}")
    if 'megaplay' in embed or 'vidwish' in embed:
        embed_url = embed
        embed_host = 'https://megaplay.buzz' if 'megaplay' in embed else 'https://vidwish.live'
        embed_referer = embed_host + '/'
        server_name = sname.strip()
        break

if not embed_url:
    print("No megaplay/vidwish URL found")
    exit(1)

print(f"\nUsing embed: {embed_url}")

# Parse file_id from URL (last numeric segment)
parts = embed_url.rstrip('/').split('/')
file_id_part = parts[-2] if parts[-1] in ('sub', 'dub') else parts[-1]
print(f"File ID from URL: {file_id_part}")

# Fetch the embed page to get data-id
HDR_E = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': BASE + '/'}
r4 = Fetcher().get(embed_url, headers=HDR_E)
page = r4.html_content

# Extract data attributes from the player div
data_id_m = re.search(r'data-id=["\'](\d+)["\']', page)
data_realid_m = re.search(r'data-realid=["\'](\d+)["\']', page)
data_mediaid_m = re.search(r'data-mediaid=["\'](\d+)["\']', page)
cid_m = re.search(r"cid\s*[:'\"]\s*['\"]?([a-f0-9]+)['\"]?", page)

print(f"data-id: {data_id_m.group(1) if data_id_m else 'NOT FOUND'}")
print(f"data-realid: {data_realid_m.group(1) if data_realid_m else 'NOT FOUND'}")
print(f"data-mediaid: {data_mediaid_m.group(1) if data_mediaid_m else 'NOT FOUND'}")
print(f"cid: {cid_m.group(1) if cid_m else 'NOT FOUND'}")
print(f"Page title: {re.search('<title>([^<]+)</title>', page).group(1) if '<title>' in page else 'N/A'}")
print(f"Page preview: {page[:500]}")

if not data_id_m:
    print("Error page served. Raw content:")
    print(page[:1000])
else:
    data_id = data_id_m.group(1)
    HDR_P = {'User-Agent': 'Mozilla/5.0', 'Referer': embed_referer, 'X-Requested-With': 'XMLHttpRequest'}

    # Try multiple known API patterns for this player type
    apis = [
        f"{embed_host}/api/source/{data_id}",
        f"{embed_host}/api/v1/source/{data_id}",
        f"{embed_host}/source/{data_id}",
        f"{embed_host}/api/media/{data_id}",
        f"{embed_host}/getSources?id={data_id}",
    ]
    for api_url in apis:
        ra = Fetcher().get(api_url, headers=HDR_P)
        body = ra.html_content[:300]
        print(f"\n{api_url}: status={ra.status}")
        if ra.status == 200 and 'm3u8' in body.lower():
            print(f"  *** m3u8 FOUND: {body}")
        elif ra.status == 200:
            print(f"  Content: {body}")
