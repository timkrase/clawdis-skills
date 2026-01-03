#!/bin/bash
# GIF CLI - Search and retrieve GIFs via Tenor
# Usage: gif.sh <command> [query] [options]

set -e

# Tenor API (free tier, no key required for basic usage)
BASE_URL="https://tenor.googleapis.com/v2"
# Anonymous API key (public, rate-limited)
API_KEY="AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ"
CLIENT="clawdis"

# Defaults
LIMIT=1
FILTER="medium"

# Parse command
COMMAND="${1:-search}"
shift || true

# Parse arguments
QUERY=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --filter)
            FILTER="$2"
            shift 2
            ;;
        *)
            if [[ -z "$QUERY" ]]; then
                QUERY="$1"
            else
                QUERY="$QUERY $1"
            fi
            shift
            ;;
    esac
done

# URL encode query
encode() {
    python3 -c "import urllib.parse; print(urllib.parse.quote('''$1'''))"
}

# Extract GIF URLs from Tenor response
extract_urls() {
    node -e "
        const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
        const results = data.results || [];
        results.slice(0, $LIMIT).forEach(r => {
            // Prefer gif format, fallback to mediumgif
            const gif = r.media_formats?.gif?.url || 
                        r.media_formats?.mediumgif?.url || 
                        r.media_formats?.tinygif?.url;
            if (gif) console.log(gif);
        });
    "
}

case $COMMAND in
    search)
        if [[ -z "$QUERY" ]]; then
            echo "Usage: gif.sh search <query> [--limit N] [--filter off|low|medium|high]" >&2
            exit 1
        fi
        ENCODED=$(encode "$QUERY")
        curl -s "${BASE_URL}/search?q=${ENCODED}&limit=${LIMIT}&contentfilter=${FILTER}&key=${API_KEY}&client_key=${CLIENT}" | extract_urls
        ;;
        
    random)
        # Search with more results and pick randomly
        if [[ -z "$QUERY" ]]; then
            echo "Usage: gif.sh random <tag>" >&2
            exit 1
        fi
        ENCODED=$(encode "$QUERY")
        curl -s "${BASE_URL}/search?q=${ENCODED}&limit=20&contentfilter=${FILTER}&key=${API_KEY}&client_key=${CLIENT}" | node -e "
            const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
            const results = data.results || [];
            if (results.length > 0) {
                const r = results[Math.floor(Math.random() * results.length)];
                const gif = r.media_formats?.gif?.url || r.media_formats?.mediumgif?.url;
                if (gif) console.log(gif);
            }
        "
        ;;
        
    trending)
        curl -s "${BASE_URL}/featured?limit=${LIMIT}&contentfilter=${FILTER}&key=${API_KEY}&client_key=${CLIENT}" | extract_urls
        ;;
        
    *)
        echo "Unknown command: $COMMAND" >&2
        echo "Commands: search, random, trending" >&2
        exit 1
        ;;
esac
