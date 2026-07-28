#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import urllib.request


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    args = parser.parse_args()
    request = urllib.request.Request(args.url, method="HEAD")
    with urllib.request.urlopen(request, timeout=20) as response:
        headers = {key.lower(): value for key, value in response.headers.items()}
    print(json.dumps({"url": args.url, "status": response.status, "headers": headers}, indent=2))


if __name__ == "__main__":
    main()
