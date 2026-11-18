#!/usr/bin/env bash
# Rebuilds the "Recently pushed" table between the RECENT markers in README.md.
# Needs: GH_TOKEN, OWNER (profile owner), SELF (this repo's name). Public repos only.
set -euo pipefail

rows=$(gh api "users/${OWNER}/repos?sort=pushed&per_page=15&type=owner" --jq '
  [ .[] | select(.fork == false and .archived == false and .name != $ENV.SELF) ][:5][]
  | "| [\(.name)](\(.html_url)) | \((.description // "-") | gsub("[|\r\n]+"; " ")) | \(.language // "-") | \(((now - (.pushed_at | fromdateiso8601)) / 3600 | floor) as $h | if $h < 1 then "just now" elif $h < 48 then "\($h)h ago" else "\($h / 24 | floor)d ago" end) |"
')

{
  echo "| Repo | What | Lang | Last push |"
  echo "| :-- | :-- | :-- | :-- |"
  echo "$rows"
} > recent.md.tmp

awk -v f=recent.md.tmp '
  /<!--RECENT:START-->/ { print; while ((getline l < f) > 0) print l; skip = 1; next }
  /<!--RECENT:END-->/   { skip = 0 }
  !skip { print }
' README.md > README.md.new

mv README.md.new README.md
rm -f recent.md.tmp
