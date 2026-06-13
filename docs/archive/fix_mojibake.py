import os
import glob

replacements = {
    'ðŸ“¤': '📤',
    'â— ': '● ',
    'Ã—': '×',
    'Ä‘ang': 'đang',
    'cháº¡y': 'chạy',
    'táº¯t': 'tắt',
    'Dá»«ng': 'Dừng',
    'Khá»Ÿi': 'Khởi',
    'Ä‘á»™ng': 'động',
    'Ä ang': 'Đang',
    'xá»­': 'xử',
    'lÃ½': 'lý',
    'Ä Ã£': 'Đã',
    'dá»«ng': 'dừng',
    'Lá»—i': 'Lỗi',
    'khá»Ÿi': 'khởi',
    'nhÆ°ng': 'nhưng',
    'chÆ°a': 'chưa',
    'sáºµn': 'sẵn',
    'sÃ ng': 'sàng',
    'Vui': 'Vui',
    'lÃ²ng': 'lòng',
    'chá» n': 'chọn',
    'trÆ°á»›c': 'trước',
    'Chá»©c': 'Chức',
    'nÄƒng': 'năng',
    'nÃ y': 'này',
    'chá»‰': 'chỉ',
    'kháº£': 'khả',
    'dá»¥ng': 'dụng',
    'má»Ÿ': 'mở',
    'trÃ¬nh': 'trình',
    'duyá»‡t': 'duyệt',
    'Ä‘á»ƒ': 'để',
    'xÃ¡c': 'xác',
    'thá»±c': 'thực',
    'thÃ nh': 'thành',
    'cÃ´ng': 'công',
    'Ä‘Æ°á»£c': 'được',
    'â ¹': '⏹',
    'â–¶': '▶',
    'â ³': '⏳',
    'Â\'ang': 'Đang',
    'chä"y': 'chạy'
}

files = glob.glob('src/renderer/**/*.js', recursive=True)
files += glob.glob('src/renderer/**/*.html', recursive=True)

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        modified = False
        for bad, good in replacements.items():
            if bad in content:
                content = content.replace(bad, good)
                modified = True
                
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Fixed specific words in {filepath}')
    except Exception as e:
        pass
