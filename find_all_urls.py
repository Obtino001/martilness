import os, re

root = '.'
found = []
for dirpath, _, filenames in os.walk(root):
    if any(p in dirpath for p in ['.git', 'node_modules', '.gemini', 'brain']):
        continue
    for f in filenames:
        if f.endswith(('.json', '.liquid')):
            path = os.path.join(dirpath, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                for line_no, line in enumerate(fp, 1):
                    for match in re.finditer(r'(https?://[^\s\"\'\<\>\\]+)', line):
                        url = match.group(1)
                        if not any(ign in url for ign in ['schema.org', 'w3.org', 'cdn.shopify.com', 'shopify.com/s/files', 'fonts.', 'klaviyo', 'trustpilot', 'google.com/maps', 'maps.app.goo.gl']):
                            found.append((path, line_no, url))

for path, line_no, url in found:
    print(f'{path}:{line_no}: {url}')
