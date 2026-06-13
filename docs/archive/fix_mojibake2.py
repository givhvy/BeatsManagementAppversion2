import os
filepath = 'src/renderer/partials/01-beats.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

import re
# Replace anything between btn-back\"> and Back</button>
content = re.sub(r'class="btn-back">.*?Back</button>', 'class="btn-back">← Back</button>', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
