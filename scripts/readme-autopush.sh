#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$REPO_ROOT/.codex-maintenance"
PID_FILE="$STATE_DIR/readme-autopush.pid"
LOG_FILE="$STATE_DIR/readme-autopush.log"
TARGET_PATH="${README_AUTOPUSH_TARGET:-README.md}"
INTERVAL_SECONDS="${README_AUTOPUSH_INTERVAL:-120}"
REMOTE_NAME="${README_AUTOPUSH_REMOTE:-origin}"

mkdir -p "$STATE_DIR"
touch "$LOG_FILE"

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >>"$LOG_FILE"
}

resolve_branch() {
  git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD
}

is_running() {
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

run_once() {
  local branch
  branch="$(resolve_branch)"

  if git -C "$REPO_ROOT" diff --quiet -- "$TARGET_PATH" && git -C "$REPO_ROOT" diff --cached --quiet -- "$TARGET_PATH"; then
    log "no README changes detected"
    return 0
  fi

  git -C "$REPO_ROOT" add -- "$TARGET_PATH"

  if git -C "$REPO_ROOT" diff --cached --quiet -- "$TARGET_PATH"; then
    log "README changed but nothing stageable after git add"
    return 0
  fi

  git -C "$REPO_ROOT" commit -m "chore: checkpoint README $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  GIT_TERMINAL_PROMPT=0 git -C "$REPO_ROOT" push "$REMOTE_NAME" "$branch"
  log "committed and pushed $TARGET_PATH to $REMOTE_NAME/$branch"
}

loop_forever() {
  echo "$$" >"$PID_FILE"
  trap 'rm -f "$PID_FILE"; log "watcher stopped"' EXIT
  log "watcher started for $TARGET_PATH every ${INTERVAL_SECONDS}s"

  while true; do
    if ! run_once; then
      log "iteration failed"
    fi
    sleep "$INTERVAL_SECONDS"
  done
}

start() {
  if is_running; then
    echo "README autopush already running with pid $(cat "$PID_FILE")"
    return 0
  fi

  if command -v setsid >/dev/null 2>&1; then
    setsid "$0" run >/dev/null 2>&1 < /dev/null &
  else
    nohup "$0" run >/dev/null 2>&1 < /dev/null &
  fi
  sleep 1

  if is_running; then
    echo "README autopush started with pid $(cat "$PID_FILE")"
  else
    echo "README autopush failed to start; see $LOG_FILE" >&2
    return 1
  fi
}

stop() {
  if ! is_running; then
    echo "README autopush is not running"
    rm -f "$PID_FILE"
    return 0
  fi

  kill "$(cat "$PID_FILE")"
  for _ in $(seq 1 20); do
    if ! is_running; then
      rm -f "$PID_FILE"
      echo "README autopush stopped"
      return 0
    fi
    sleep 0.25
  done

  echo "README autopush did not stop cleanly" >&2
  return 1
}

status() {
  if is_running; then
    echo "README autopush is running with pid $(cat "$PID_FILE")"
  else
    echo "README autopush is not running"
    return 1
  fi
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  status)
    status
    ;;
  run)
    loop_forever
    ;;
  run-once)
    run_once
    ;;
  *)
    cat <<'EOF'
Usage: scripts/readme-autopush.sh <start|stop|status|run|run-once>

Environment:
  README_AUTOPUSH_INTERVAL  Poll interval in seconds (default: 120)
  README_AUTOPUSH_REMOTE    Git remote name (default: origin)
  README_AUTOPUSH_TARGET    Repo-relative target path (default: README.md)
EOF
    exit 1
    ;;
esac
