import sys
import re

def find_mismatch(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Find all JSX tags
    tags = re.findall(r'<(/?[a-zA-Z]+)([^>]*)>', content)
    
    stack = []
    
    for tag_name, attrs in tags:
        # Check if it's self-closing
        if attrs.strip().endswith('/'):
            continue
        
        if tag_name.startswith('/'):
            name = tag_name[1:]
            if not stack:
                print(f"Extra closing tag </{name}>")
                continue
            if stack[-1] == name:
                stack.pop()
            else:
                print(f"Mismatched closing tag </{name}>. Expected </{stack[-1]}>")
                # We could try to recover here but let's just break
                break
        else:
            # We don't care about standard void elements in HTML, but JSX requires them to be self closed
            # except standard html tags like img, br, hr, input which MIGHT not be self closed in bad JSX
            # but in React they must be.
            stack.append(tag_name)

    print(f"Unclosed tags at end: {stack}")

if __name__ == '__main__':
    find_mismatch('/Users/khanak.gera/Desktop/SchemeBot/SchemeBot/frontend/app/dashboard/page.tsx')
