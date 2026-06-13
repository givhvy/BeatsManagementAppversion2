import os
import re

filepath = 'src/renderer/partials/13-midi.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'class="btn-back">.*?Back</button>', 'class="btn-back">← Back</button>', content)
content = re.sub(r'âˆ’', '-', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# Also check 09-beatstars.html and 10-settings-and-money.html for the same comment issue just in case
def fix_comments(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if not content.startswith('<!--'):
            if 'SECTION' in content[:100] and '====' in content[:100]:
                content = '<!-- ============================\n' + content
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
    except:
        pass

import glob
for p in glob.glob('src/renderer/partials/*.html'):
    fix_comments(p)
