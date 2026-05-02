import urllib.request
import ssl

urls = [
    "https://wishembed.pro/e/i0644nt2b5am",
    "https://moonplayer.cc/e/02aZ5qjK9V5l",
    "https://hydrax.net/watch?v=A2dY_pM5O",
    "https://animotvslash.org/embed.php?id=NjExNzAyNg=="
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for u in urls:
    print(f"\n--- Fetching {u} ---")
    req = urllib.request.Request(u, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://animotvslash.org/'
    })
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            text = response.read().decode('utf-8', errors='ignore')
            print(f"Status: {response.getcode()}")
            print(f"Length: {len(text)}")
            if "m3u8" in text.lower():
                print("FOUND m3u8 in response!")
            if "mp4" in text.lower():
                print("FOUND mp4 in response!")
    except Exception as e:
        print(f"Error: {e}")
