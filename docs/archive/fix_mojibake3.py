import os
import re

filepath = 'src/renderer/partials/01-beats.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'id="packs-zoom-out".*?>.*?</button>', 'id="packs-zoom-out" class="btn-secondary btn-small" title="Zoom Out" style="padding:3px 9px;font-size:16px;line-height:1;">-</button>', content)

content = re.sub(r'ðŸ’¡', '💡', content)
content = re.sub(r'âˆ’', '-', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
