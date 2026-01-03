---
name: gif
description: Search and send GIFs via Tenor API — reactions, vibes, chaos.
homepage: https://tenor.com/
metadata: {"clawdis":{"emoji":"🎬","requires":{"bins":["curl","node"]}}}
---

# GIF Skill 🎬

Search and retrieve GIFs for any occasion. Perfect for chat reactions!

## Quick Start

```bash
# Search for a GIF
{baseDir}/scripts/gif.sh search "thumbs up"

# Get a random GIF by tag (uses search + random pick)
{baseDir}/scripts/gif.sh random "excited"

# Get trending GIFs
{baseDir}/scripts/gif.sh trending

# Get multiple results
{baseDir}/scripts/gif.sh search "celebration" --limit 5
```

## Output

Returns a GIF URL that can be embedded directly in messages:
```
https://media.tenor.com/xyz/something.gif
```

## Options

```bash
# Limit results (default: 1)
{baseDir}/scripts/gif.sh search "cat" --limit 5

# Content filter (off, low, medium, high) - default: medium
{baseDir}/scripts/gif.sh search "party" --filter high
```

## In Chat

When someone asks for a GIF or you want to react:
1. Run the search
2. Return the URL with `MEDIA:` prefix for inline display

Example response:
```
Here's that celebration GIF! 🎉
MEDIA:https://media.tenor.com/xyz/something.gif
```

## Use Cases

- **Reactions**: "zeig mir ein facepalm gif" → instant mood
- **Celebrations**: Project done? GIF time! 🎊
- **Explanations**: Sometimes a GIF says it better
- **Chaos**: Random GIF roulette 🎰

## API

Uses Tenor (Google) API — no API key required for basic usage!
