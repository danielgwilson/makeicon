#!/bin/bash
set +e

cwd="$CLAUDE_PROJECT_DIR"
if [ -z "$cwd" ] || [ ! -d "$cwd" ]; then
  exit 0
fi

metadata_file="$cwd/.claude/session-metadata.jsonl"
if [ ! -f "$metadata_file" ]; then
  exit 0
fi

last_entry=$(tail -1 "$metadata_file" 2>/dev/null)
if [ -z "$last_entry" ]; then
  exit 0
fi

if command -v jq >/dev/null 2>&1; then
  echo "Previous session:"
  echo "$last_entry" | jq -r '"  Ended: " + (.timestamp // "unknown") + "
  Reason: " + (.reason // "unknown")' 2>/dev/null || true
else
  echo "Previous session: $last_entry"
fi

exit 0
