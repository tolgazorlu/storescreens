#!/bin/bash
# Run by ~/.claude/hooks/verify_on_stop.sh before an agent may finish; keep it under 300 s.
set -e
npm run -s typecheck
npm run -s lint
npm test --silent
