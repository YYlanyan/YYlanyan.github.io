#!/usr/bin/env bash
# Run on Vultr via SSH after uploading a complete release.
set -euo pipefail

release="${1:?Usage: activate-vultr.sh RELEASE}"
case "$release" in
  ''|*[!a-zA-Z0-9_-]*)
    echo "Invalid release name" >&2
    exit 1
    ;;
esac

deploy_root=/var/www/blog-deploy
release_dir="$deploy_root/releases/$release"
temporary_link="$deploy_root/.current-$release"

test -s "$release_dir/index.html"
test "$(cat "$release_dir/deploy-version.txt")" = "$release"
test -L "$deploy_root/current"
previous="$(readlink "$deploy_root/current")"
trap 'rm -f -- "$temporary_link"' EXIT

switch_to() {
  ln -s -- "$1" "$temporary_link"
  mv -Tf -- "$temporary_link" "$deploy_root/current"
}

switch_to "releases/$release"

# Check Nginx itself, so a Worker fallback cannot mask a broken release.
# The version file also detects a forgotten Nginx root migration.
origin=http://127.0.0.1:8080
if served_release="$(curl --fail --silent --show-error --max-time 10 \
    -H 'Host: origin-blog.nuvorith.com' "$origin/deploy-version.txt")" \
  && [ "$served_release" = "$release" ] \
  && curl --fail --silent --show-error --max-time 10 \
    -H 'Host: origin-blog.nuvorith.com' -o /dev/null "$origin/"; then
  printf 'Activated release: %s\nPrevious target: %s\n' "$release" "$previous"
else
  switch_to "$previous"
  echo "Nginx verification failed; restored $previous" >&2
  exit 1
fi

# Keep earlier releases for manual rollback; do not delete the original site.
