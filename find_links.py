import glob
import re

for f in glob.glob('**/*', recursive=True):
    if not f.endswith(('.json', '.liquid')):
        continue
    if 'node_modules' in f or '.git' in f or 'find_links.py' in f:
        continue
    try:
        txt = open(f, encoding='utf-8').read()
        # Look for /blog/ or martilness.dk or any domain
        for pattern in [r'martilness\.dk[^\s"\'<>]*', r'/blog/[^\s"\'<>]*', r'https?://[a-zA-Z0-9.\-_]+/[^\s"\'<>]*']:
            matches = re.findall(pattern, txt)
            clean = []
            for m in matches:
                if any(x in m for x in ['schema.org', 'cdn.shopify.com', 'w3.org', 'google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'pinterest.com', 'shopify.com', 'foxecom.com', 'vimeo.com']):
                    continue
                clean.append(m)
            if clean:
                print(f"{f} -> {set(clean)}")
    except:
        pass
