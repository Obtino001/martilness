import json, re

def load_shopify_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    # Strip comments /* ... */
    content_clean = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL).strip()
    return json.loads(content_clean)

data = load_shopify_json('sections/footer-group.json')

def find_links(obj, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            find_links(v, f'{path}.{k}')
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            find_links(v, f'{path}[{i}]')
    elif isinstance(obj, str):
        if 'http' in obj or 'martilness' in obj or '.dk' in obj or 'shopify://' in obj:
            if any(key in path.lower() for key in ['link', 'url', 'text', 'menu']):
                print(f'{path}: {obj}')

find_links(data)
