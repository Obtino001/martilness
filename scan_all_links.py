import os, json, re

patterns = [
    re.compile(r'href=\\?[\"\']([^\\\"\']+)'),
    re.compile(r'\"(link|url|link_url|button_link|banner_link)\":\s*\"([^\"]+)\"')
]

root = '.'
for dirpath, _, filenames in os.walk(root):
    if any(p in dirpath for p in ['.git', 'node_modules', '.gemini', 'brain']):
        continue
    for f in filenames:
        if f.endswith('.json') or f.endswith('.liquid'):
            path = os.path.join(dirpath, f)
            try:
                with open(path, 'r', encoding='utf-8') as fp:
                    content = fp.read()
                    for m in patterns[0].finditer(content):
                        url = m.group(1)
                        if any(k in url.lower() for k in ['martilness', 'wordpress', 'wp-', 'franklins', 'myshopify']) or \
                           ('http' in url.lower() and not any(k in url.lower() for k in ['trustpilot', 'schema.org', 'w3.org', 'google', 'shopify.com/s/files', 'cdn.shopify.com', 'fonts.', 'klaviyo'])):
                            print(f"{path} [HREF]: {url}")
                    for m in patterns[1].finditer(content):
                        url = m.group(2)
                        if any(k in url.lower() for k in ['martilness', 'wordpress', 'wp-', 'franklins', 'myshopify']) or \
                           ('http' in url.lower() and not any(k in url.lower() for k in ['trustpilot', 'schema.org', 'w3.org', 'google', 'shopify.com/s/files', 'cdn.shopify.com', 'fonts.', 'klaviyo'])):
                            print(f"{path} [{m.group(1)}]: {url}")
            except Exception as e:
                pass
