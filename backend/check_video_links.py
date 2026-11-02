"""
check_video_links.py
─────────────────────────────────────────────────────────────────────────
Audits every hardcoded YouTube URL in backend/models/static_data.py using
YouTube's public oEmbed endpoint (no API key needed) and reports which
ones are dead (removed, private, or region-blocked).

Usage:
    cd backend
    python check_video_links.py

Or point it at a different file:
    python check_video_links.py path/to/static_data.py
"""
import re
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

DEFAULT_PATH = "models/static_data.py"


def extract_videos(path):
    """Pull every {"title": ..., "url": ...} pair out of the file via regex
    (no need to import the module / its dependencies)."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    pattern = re.compile(
        r'"title":\s*"([^"]+)"\s*,\s*'
        r'\n?\s*"url":\s*"([^"]+)"',
        re.MULTILINE,
    )
    return pattern.findall(content)


def check_video(url, retries=2):
    oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(url, safe='')}&format=json"
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    return True, None
                return False, f"HTTP {resp.status}"
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return False, "404 — video unavailable/removed/private"
            if attempt < retries:
                time.sleep(1)
                continue
            return False, f"HTTP {e.code}"
        except Exception as e:
            if attempt < retries:
                time.sleep(1)
                continue
            return False, str(e)
    return False, "unknown error"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    videos = extract_videos(path)
    print(f"Found {len(videos)} video entries in {path}\n")

    broken = []
    for i, (title, url) in enumerate(videos, 1):
        ok, err = check_video(url)
        status = "OK  " if ok else "DEAD"
        print(f"[{i:3}/{len(videos)}] {status}  {title[:60]:<60}  {url}" + (f"   ← {err}" if err else ""))
        if not ok:
            broken.append((title, url, err))
        time.sleep(0.2)  # be polite to YouTube's endpoint

    print("\n" + "=" * 70)
    if broken:
        print(f"{len(broken)} BROKEN LINK(S) FOUND:\n")
        for title, url, err in broken:
            print(f"  - {title}\n    {url}\n    Reason: {err}\n")
    else:
        print("All video links are healthy! 🎉")


if __name__ == "__main__":
    main()