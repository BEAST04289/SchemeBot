import re

def check_divs(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Find all divs, but exclude self-closing
    # A self closing div is <div ... />
    
    # Let's just find the index of every <div and every </div>
    open_divs = len(re.findall(r'<div(?![a-zA-Z])(?:[^>]*?[^\/])?>', content))
    close_divs = len(re.findall(r'</div>', content))
    
    print(f"Open divs: {open_divs}")
    print(f"Close divs: {close_divs}")

if __name__ == '__main__':
    check_divs('/Users/khanak.gera/Desktop/SchemeBot/SchemeBot/frontend/app/dashboard/page.tsx')
