import os, json, re

def load_shopify_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content_clean = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL).strip()
    return json.loads(content_clean)

results = []

for root_dir in ['templates', 'sections', 'config', 'snippets']:
    for dirpath, _, filenames in os.walk(root_dir):
        for f in filenames:
            if f.endswith('.json'):
                path = os.path.join(dirpath, f)
                try:
                    data = load_shopify_json(path)
                    
                    def scan_obj(obj, curr_path):
                        if isinstance(obj, dict):
                            for k, v in obj.items():
                                scan_obj(v, f"{curr_path}.{k}")
                        elif isinstance(obj, list):
                            for i, v in enumerate(obj):
                                scan_obj(v, f"{curr_path}[{i}]")
                        elif isinstance(obj, str):
                            # check if it contains martilness.dk or wordpress or wp- or http
                            if 'martilness.dk' in obj:
                                # if not trustpilot and not mailto/email
                                if 'trustpilot' not in obj and 'info@martilness.dk' not in obj:
                                    results.append((path, curr_path, obj))
                            elif any(w in obj for w in ['wordpress', 'wp-content', 'wp-admin', 'wp-includes']):
                                results.append((path, curr_path, obj))
                            elif 'franklins.dk' in obj:
                                results.append((path, curr_path, obj))
                            elif 'myshopify.com' in obj:
                                results.append((path, curr_path, obj))
                                
                    scan_obj(data, '')
                except Exception as e:
                    print(f"Error parsing {path}: {e}")

print(f"Total matching items: {len(results)}")
for path, curr_path, val in results:
    print(f"\nFILE: {path}\nPATH: {curr_path}\nVALUE: {val[:200]}")
