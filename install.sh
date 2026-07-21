#!/usr/bin/env bash
# Copyright (c) 2026 codex-react-ui contributors
# One-shot installer for a fresh host: deps → bun install → build → wrapper → optional start.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${CODEX_UI_BIN_DIR:-$HOME/.local/bin}"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
CONFIG_DIR="${CODEX_UI_CONFIG_DIR:-$XDG_CONFIG_HOME/codex-react-ui}"
USER_ENV="$CONFIG_DIR/.env"
WRAPPER="$BIN_DIR/codex-react-ui"
DEFAULT_PORT="${CODEX_UI_PORT:-43110}"
DEFAULT_HOST="${CODEX_UI_HOST:-127.0.0.1}"

# --- flags -------------------------------------------------------------------
SKIP_BUN=0
SKIP_BUILD=0
SKIP_CODEX=0
SKIP_PLAYWRIGHT=0
FORCE_ENV=0
NO_ENV=0
NO_WRAPPER=0
START_AFTER=0
DEV_MODE=0
OFFLINE=0

usage() {
  cat <<'EOF'
Usage: ./install.sh [options]

  One-click install of Codex React UI on a new Linux host.

  What it does:
    1. Ensure git / curl / unzip (best-effort package manager install)
    2. Install Bun if missing (https://bun.sh)
    3. bun install  (workspace deps)
    4. bun run build  (shared + server + web)
    5. Write ~/.config/codex-react-ui/.env (JWT, admin, port)
    6. Install ~/.local/bin/codex-react-ui launcher wrapper
    7. Optionally check / hint for Codex CLI (CODEX_BIN)
    8. Verify UI with Playwright headless browser test

Options:
  --bin-dir DIR       Wrapper install dir (default: ~/.local/bin)
  --config-dir DIR    Config dir (default: ~/.config/codex-react-ui)
  --port N            Default CODEX_UI_PORT (default: 43110)
  --host ADDR         Default CODEX_UI_HOST (default: 127.0.0.1)
  --force-env         Overwrite existing .env
  --no-env            Do not create config .env
  --no-wrapper        Skip writing ~/.local/bin/codex-react-ui
  --skip-bun          Do not install Bun (must already be on PATH)
  --skip-build        Skip bun run build (install deps only)
  --skip-codex        Do not check for Codex CLI
  --skip-playwright   Skip Playwright post-install UI verification
  --start             Start the UI after install (foreground)
  --dev               After install, prefer `bun run dev` when starting
  --offline           Never run network package installs (fail if deps missing)
  -h, --help          Show this help

After install:
  1. Ensure ~/.local/bin is on PATH
  2. Edit ~/.config/codex-react-ui/.env  (admin password + JWT secret)
  3. codex-react-ui                 # production-style: bun run launch
  4. Open http://127.0.0.1:43110/   (membership login when auth is on)

Environment overrides (also written into .env when generated):
  CODEX_UI_PORT  CODEX_UI_HOST  CODEX_UI_JWT_SECRET
  CODEX_UI_ADMIN_EMAIL  CODEX_UI_ADMIN_PASSWORD  CODEX_BIN
  CODEX_UI_AUTH  CODEX_UI_TOKEN
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bin-dir) BIN_DIR="$2"; shift 2 ;;
    --config-dir) CONFIG_DIR="$2"; USER_ENV="$CONFIG_DIR/.env"; shift 2 ;;
    --port) DEFAULT_PORT="$2"; shift 2 ;;
    --host) DEFAULT_HOST="$2"; shift 2 ;;
    --force-env) FORCE_ENV=1; shift ;;
    --no-env) NO_ENV=1; shift ;;
    --no-wrapper) NO_WRAPPER=1; shift ;;
    --skip-bun) SKIP_BUN=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --skip-codex) SKIP_CODEX=1; shift ;;
    --skip-playwright) SKIP_PLAYWRIGHT=1; shift ;;
    --start) START_AFTER=1; shift ;;
    --dev) DEV_MODE=1; shift ;;
    --offline) OFFLINE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

WRAPPER="$BIN_DIR/codex-react-ui"
USER_ENV="$CONFIG_DIR/.env"

log()  { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

require_root_files() {
  [[ -f "$ROOT/package.json" ]] || die "package.json not found in $ROOT (run from codex-react-ui checkout)"
  [[ -d "$ROOT/apps/server" && -d "$ROOT/apps/web" ]] || die "apps/server or apps/web missing — incomplete checkout"
}

ensure_path_bin() {
  local dir="$1"
  [[ -n "${dir:-}" ]] || return 0
  case ":$PATH:" in
    *":$dir:"*) ;;
    *) export PATH="$dir:$PATH" ;;
  esac
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

detect_pkg_manager() {
  if have_cmd apt-get; then echo apt
  elif have_cmd dnf; then echo dnf
  elif have_cmd yum; then echo yum
  elif have_cmd pacman; then echo pacman
  elif have_cmd zypper; then echo zypper
  elif have_cmd apk; then echo apk
  elif have_cmd brew; then echo brew
  else echo none
  fi
}

install_system_packages() {
  local pkgs=("$@")
  local need=()
  local p
  for p in "${pkgs[@]}"; do
    case "$p" in
      git) have_cmd git || need+=("$p") ;;
      curl) have_cmd curl || need+=("$p") ;;
      unzip) have_cmd unzip || need+=("$p") ;;
      ca-certificates) need+=("$p") ;;
      *) have_cmd "$p" || need+=("$p") ;;
    esac
  done
  # ca-certificates always optional check via file
  [[ ${#need[@]} -eq 0 ]] && return 0

  if [[ "$OFFLINE" -eq 1 ]]; then
    die "missing system tools: ${need[*]} (and --offline set)"
  fi

  local pm
  pm="$(detect_pkg_manager)"
  log "installing system packages: ${need[*]} (via $pm)"
  case "$pm" in
    apt)
      if [[ "$(id -u)" -eq 0 ]]; then
        apt-get update -y
        DEBIAN_FRONTEND=noninteractive apt-get install -y "${need[@]}"
      else
        sudo apt-get update -y
        sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "${need[@]}"
      fi
      ;;
    dnf)
      if [[ "$(id -u)" -eq 0 ]]; then dnf install -y "${need[@]}"
      else sudo dnf install -y "${need[@]}"
      fi
      ;;
    yum)
      if [[ "$(id -u)" -eq 0 ]]; then yum install -y "${need[@]}"
      else sudo yum install -y "${need[@]}"
      fi
      ;;
    pacman)
      if [[ "$(id -u)" -eq 0 ]]; then pacman -Sy --noconfirm "${need[@]}"
      else sudo pacman -Sy --noconfirm "${need[@]}"
      fi
      ;;
    zypper)
      if [[ "$(id -u)" -eq 0 ]]; then zypper install -y "${need[@]}"
      else sudo zypper install -y "${need[@]}"
      fi
      ;;
    apk)
      if [[ "$(id -u)" -eq 0 ]]; then apk add --no-cache "${need[@]}"
      else sudo apk add --no-cache "${need[@]}"
      fi
      ;;
    brew)
      brew install "${need[@]}"
      ;;
    *)
      die "no package manager found; install manually: ${need[*]}"
      ;;
  esac
}

ensure_bun() {
  ensure_path_bin "$HOME/.bun/bin"
  ensure_path_bin "$BIN_DIR"
  if have_cmd bun; then
    log "bun already installed: $(bun --version) ($(command -v bun))"
    return 0
  fi
  if [[ "$SKIP_BUN" -eq 1 ]]; then
    die "bun not found and --skip-bun was set"
  fi
  if [[ "$OFFLINE" -eq 1 ]]; then
    die "bun not found and --offline set (install Bun manually: https://bun.sh)"
  fi
  log "installing Bun…"
  curl -fsSL https://bun.sh/install | bash
  ensure_path_bin "$HOME/.bun/bin"
  have_cmd bun || die "bun install finished but bun is still not on PATH"
  log "bun $(bun --version)"
}

rand_hex() {
  local n="${1:-32}"
  if have_cmd openssl; then
    openssl rand -hex "$n"
  elif have_cmd head && [[ -r /dev/urandom ]]; then
    head -c "$n" /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c "$((n * 2))"
    echo
  else
    # last resort
    date +%s%N | sha256sum 2>/dev/null | awk '{print $1}' || echo "change-me-$(date +%s)"
  fi
}

write_env_file() {
  if [[ "$NO_ENV" -eq 1 ]]; then
    log "skip .env (--no-env)"
    return 0
  fi
  mkdir -p "$CONFIG_DIR"
  if [[ -f "$USER_ENV" && "$FORCE_ENV" -ne 1 ]]; then
    log "keep existing env: $USER_ENV (use --force-env to overwrite)"
    return 0
  fi

  local jwt secret admin_email admin_pass
  jwt="${CODEX_UI_JWT_SECRET:-$(rand_hex 32)}"
  admin_email="${CODEX_UI_ADMIN_EMAIL:-admin@example.com}"
  admin_pass="${CODEX_UI_ADMIN_PASSWORD:-ChangeMe123!}"
  local codex_bin="${CODEX_BIN:-codex}"

  cat >"$USER_ENV" <<EOF
# Codex React UI — generated by install.sh ($(date -u +%Y-%m-%dT%H:%MZ))
# File mode should stay private (0600).

CODEX_UI_HOST=${DEFAULT_HOST}
CODEX_UI_PORT=${DEFAULT_PORT}

# Membership JWT (required for stable sessions across restarts)
CODEX_UI_JWT_SECRET=${jwt}
CODEX_UI_JWT_EXPIRE_HOURS=24

# First-boot admin (created when users table has no admin)
CODEX_UI_ADMIN_EMAIL=${admin_email}
CODEX_UI_ADMIN_PASSWORD=${admin_pass}

# Set to 0/off to disable membership and use single CODEX_UI_TOKEN mode
CODEX_UI_AUTH=1

# Codex CLI used by the app-server bridge
CODEX_BIN=${codex_bin}

# Optional: local token fallback when auth is off
# CODEX_UI_TOKEN=

# Optional: launch adapter clone root for Settings → one-click install
# CODEX_UI_LAUNCH_SRC_ROOT=\$HOME/.codex-react-ui/launch-src
EOF
  chmod 600 "$USER_ENV" || true
  log "wrote $USER_ENV"
  if [[ "$admin_pass" == "ChangeMe123!" ]]; then
    warn "default admin password is ChangeMe123! — change CODEX_UI_ADMIN_PASSWORD before production"
  fi
}

write_wrapper() {
  if [[ "$NO_WRAPPER" -eq 1 ]]; then
    log "skip wrapper (--no-wrapper)"
    return 0
  fi
  mkdir -p "$BIN_DIR"
  cat >"$WRAPPER" <<EOF
#!/usr/bin/env bash
# Codex React UI launcher — installed by install.sh
set -euo pipefail
ROOT="$ROOT"
CONFIG_ENV="$USER_ENV"
BIN_BUN="\${BUN_BIN:-}"

export PATH="\$HOME/.bun/bin:\$HOME/.local/bin:\$PATH"

if [[ -z "\$BIN_BUN" ]]; then
  if command -v bun >/dev/null 2>&1; then
    BIN_BUN="\$(command -v bun)"
  else
    echo "error: bun not found; re-run $ROOT/install.sh" >&2
    exit 1
  fi
fi

if [[ -f "\$CONFIG_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "\$CONFIG_ENV"
  set +a
fi

cd "\$ROOT"

mode="\${1:-}"
if [[ "\$mode" == "dev" ]]; then
  shift || true
  exec "\$BIN_BUN" run dev "\$@"
fi
if [[ "\$mode" == "build" ]]; then
  shift || true
  exec "\$BIN_BUN" run build "\$@"
fi
if [[ "\$mode" == "start" || "\$mode" == "launch" || -z "\$mode" ]]; then
  [[ "\$mode" == "start" || "\$mode" == "launch" ]] && shift || true
  # Prefer production launcher (serves web dist + API)
  exec "\$BIN_BUN" run launch -- "\$@"
fi

# pass-through: codex-react-ui <bun-script>
exec "\$BIN_BUN" run "\$mode" "\$@"
EOF
  chmod 755 "$WRAPPER"
  log "installed wrapper: $WRAPPER"
}

check_codex() {
  if [[ "$SKIP_CODEX" -eq 1 ]]; then
    return 0
  fi
  # shellcheck disable=SC1090
  if [[ -f "$USER_ENV" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$USER_ENV" || true
    set +a
  fi
  local bin="${CODEX_BIN:-codex}"
  ensure_path_bin "$HOME/.local/bin"
  if [[ -x "$bin" ]] || have_cmd "$bin"; then
    local path
    path="$(command -v "$bin" 2>/dev/null || echo "$bin")"
    log "Codex CLI found: $path"
    if command -v "$bin" >/dev/null 2>&1; then
      "$bin" --version 2>/dev/null | head -n 1 || true
    fi
    return 0
  fi
  warn "Codex CLI not found (CODEX_BIN=$bin)."
  warn "Install OpenAI Codex CLI and ensure it is on PATH, or set CODEX_BIN in $USER_ENV."
  warn "UI will boot without it, but chat/engine features need \`codex app-server\`."
}

bun_install_and_build() {
  ensure_path_bin "$HOME/.bun/bin"
  ensure_path_bin "$BIN_DIR"
  have_cmd bun || die "bun is required"
  cd "$ROOT"
  log "bun install (workspaces)…"
  bun install
  if [[ "$SKIP_BUILD" -eq 1 ]]; then
    log "skip build (--skip-build)"
    return 0
  fi
  log "bun run build…"
  bun run build
  log "build complete"
}

verify_with_playwright() {
  if [[ "$SKIP_PLAYWRIGHT" -eq 1 ]]; then
    log "skip Playwright verification (--skip-playwright set)"
    return 0
  fi

  log "checking Playwright browser dependencies…"
  if [[ "$OFFLINE" -eq 0 ]]; then
    npx playwright install chromium --with-deps >/dev/null 2>&1 || npx playwright install chromium >/dev/null 2>&1 || warn "playwright browser install had warnings"
  fi

  local host="${CODEX_UI_HOST:-$DEFAULT_HOST}"
  local port="${CODEX_UI_PORT:-$DEFAULT_PORT}"
  local url="http://${host}:${port}/"

  local pid=""
  local created_server=0

  if ! curl -s "http://${host}:${port}/api/health" >/dev/null 2>&1; then
    log "starting temporary server on ${url} for Playwright verification…"
    cd "$ROOT"
    if [[ -f "$USER_ENV" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "$USER_ENV"
      set +a
    fi
    bun run launch -- --skip-build >/dev/null 2>&1 &
    pid=$!
    created_server=1

    local count=0
    until curl -s "http://${host}:${port}/api/health" >/dev/null 2>&1; do
      sleep 0.5
      count=$((count + 1))
      if [[ $count -ge 30 ]]; then
        [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
        die "server failed to start on ${url} within 15s"
      fi
    done
  fi

  log "running Playwright UI verification check on ${url}…"
  if node "$ROOT/scripts/check-ui.mjs" "$url"; then
    log "Playwright verification passed! UI is working properly."
  else
    [[ "$created_server" -eq 1 && -n "$pid" ]] && kill "$pid" 2>/dev/null || true
    die "Playwright UI verification failed for ${url}"
  fi

  if [[ "$created_server" -eq 1 && "$START_AFTER" -ne 1 && -n "$pid" ]]; then
    log "stopping temporary test server…"
    kill "$pid" 2>/dev/null || true
  fi
}

print_summary() {
  cat <<EOF

────────────────────────────────────────────────────────
 Codex React UI install complete
────────────────────────────────────────────────────────
  Repo:     $ROOT
  Config:   $USER_ENV
  Wrapper:  $WRAPPER
  URL:      http://${DEFAULT_HOST}:${DEFAULT_PORT}/

Next:
  1. export PATH="\$HOME/.local/bin:\$HOME/.bun/bin:\$PATH"
  2. Review secrets:  nano $USER_ENV
  3. Start UI:        codex-react-ui
       or:            codex-react-ui dev
       or:            cd $ROOT && bun run launch

Default admin (if membership enabled):
  email from .env (default admin@example.com)
  password from .env (default ChangeMe123!)

Optional:
  Settings → Launch adapters  — detect / one-click install *-launch bridges
  Docker:  cd deploy && cp .env.example .env && docker compose up -d --build
────────────────────────────────────────────────────────
EOF
}

start_server() {
  log "starting Codex React UI…"
  ensure_path_bin "$HOME/.bun/bin"
  ensure_path_bin "$BIN_DIR"
  if [[ -f "$USER_ENV" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$USER_ENV"
    set +a
  fi
  cd "$ROOT"
  if [[ "$DEV_MODE" -eq 1 ]]; then
    exec bun run dev
  fi
  exec bun run launch -- --skip-build
}

# --- main --------------------------------------------------------------------
require_root_files
log "installing Codex React UI from $ROOT"

# Basic OS tools (git for any sub-clones later; curl/unzip for Bun)
if [[ "$OFFLINE" -eq 0 ]]; then
  install_system_packages git curl unzip || warn "system package install failed; continuing if tools already present"
fi
have_cmd git || die "git is required"
have_cmd curl || die "curl is required"

ensure_bun
bun_install_and_build
write_env_file
write_wrapper
check_codex
ensure_path_bin "$BIN_DIR"
ensure_path_bin "$HOME/.bun/bin"
verify_with_playwright
print_summary

if [[ "$START_AFTER" -eq 1 ]]; then
  start_server
fi
