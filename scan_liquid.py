import os, re

results = []

for root_dir in ['sections', 'snippets', 'layout']:
    for dirpath, _, filenames in os.walk(root_dir):
        for f in filenames:
            if f.endswith('.liquid'):
                path = os.path.join(dirpath, f)
                with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                    for line_no, line in enumerate(fp, 1):
                        if 'martilness.dk' in line:
                            if 'trustpilot' not in line and 'info@martilness.dk' not in line:
                                results.append((path, line_no, line.strip()))
                        elif any(w in line for w in ['wordpress', 'wp-content', 'wp-admin', 'wp-includes', 'franklins.dk', 'myshopify.com']):
                            results.append((path, line_no, line.strip()))

print(f"Total matching liquid lines: {len(results)}")
for path, line_no, line in results:
    print(f"{path}:{line_no}: {line}")
