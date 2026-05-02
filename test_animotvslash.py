import urllib.request
import re
import base64

req = urllib.request.Request('https://animotvslash.org/anime/that-time-i-got-reincarnated-as-a-slime-season-4-episode-1/', headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        text = response.read().decode('utf-8')
        
        selectM = re.search(r'<select class=["\']mirror["\'][\s\S]*?</select>', text, re.IGNORECASE)
        if selectM:
            optionRx = re.compile(r'<option value=["\']([^"\']+)["\'][^>]*>\s*([^<]+)\s*</option>', re.IGNORECASE)
            for m in optionRx.finditer(selectM.group(0)):
                b64 = m.group(1)
                label = m.group(2).strip()
                try:
                    decoded = base64.b64decode(b64).decode('utf-8')
                    iframeM = re.search(r'src=["\']([^"\']+)["\']', decoded, re.IGNORECASE)
                    src = iframeM.group(1) if iframeM else 'No iframe src'
                    print(f'{label} -> {src}')
                except Exception as e:
                    print(f'{label} -> Error decoding')
        else:
            print('No select found')
except Exception as e:
    print(f'Error: {e}')
