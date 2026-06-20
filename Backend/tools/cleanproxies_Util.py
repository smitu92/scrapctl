

# .text.splitlines()
import os


def clean():
    base_dir = os.path.dirname(__file__)
    path = os.path.join(base_dir, "data", "proxies.txt")
    if not os.path.exists(path):
        return []
        
    with open(path, "r") as f:
        lines = f.read().splitlines()
        
    cleaned_proxies = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Handle cases where proxy might already be formatted
        if "@" in line:
            cleaned_proxies.append(line)
            continue
            
        parts = line.split(":")
        if len(parts) == 4:
            # We need to guess: ip:port:user:pass OR user:pass:ip:port
            # Simple heuristic: IPs usually have dots in the first or third part
            if "." in parts[0]:
                # ip:port:user:pass
                formatted = f"{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}"
            else:
                # user:pass:ip:port
                formatted = f"{parts[0]}:{parts[1]}@{parts[2]}:{parts[3]}"
            cleaned_proxies.append(formatted)
        elif len(parts) == 2:
            # ip:port (no auth)
            cleaned_proxies.append(line)
        else:
            # Fallback
            cleaned_proxies.append(line)
            
    return list(dict.fromkeys(cleaned_proxies)) # Remove duplicates

