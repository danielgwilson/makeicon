#!/bin/bash
set +e

cwd="$CLAUDE_PROJECT_DIR"
if [ -z "$cwd" ] || [ ! -d "$cwd" ]; then
  exit 0
fi

metadata_file="$cwd/.claude/session-metadata.jsonl"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
commit=$(git -C "$cwd" rev-parse --short HEAD 2>/dev/null || echo "")
dirty=$(git -C "$cwd" status --porcelain 2>/dev/null | wc -l | tr -d ' ')

entry=$(cat <<EOF
{"timestamp":"$timestamp","reason":"session_end","git":{"branch":"$branch","commit":"$commit","dirty":$dirty}}
EOF
)

mkdir -p "$cwd/.claude"
touch "$metadata_file"
echo "$entry" >> "$metadata_file"

exit 0
