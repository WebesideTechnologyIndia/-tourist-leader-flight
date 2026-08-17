#!/bin/bash
# Rebuild touristleader.com from ./app_src and swap the result into ./app.
#
# Why the unusual flags: this box reports 64 CPUs but the hosting account has an
# account-wide cap on open threads (~175, shared with every other site here).
# Anything that sizes a native thread pool from the CPU count — Turbopack's Rust
# runtime, Prisma's query engine — blows that cap and the build aborts with
# SIGABRT / "OS can't spawn worker thread". Pinning CPU affinity makes every one
# of those pools size itself to 4 instead, which is what makes the build finish.
set -e

D=/home/u925562231/domains/touristleader.com
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
export NODE_OPTIONS="--max-old-space-size=4096"
export BUILD_CPUS=2
unset NODE_ENV                 # keep devDependencies; the build needs Tailwind's PostCSS plugin

cd "$D/app_src"

echo "==> installing dependencies"
npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund
npm install --no-audit --no-fund sharp

echo "==> generating prisma client"
npx prisma generate

echo "==> building"
rm -rf .next
BUILD_STANDALONE=1 taskset -c 0-3 npx next build

echo "==> assembling runtime"
rm -rf "$D/app.new"
if [ -d ".next/standalone/app_src" ]; then
  cp -a .next/standalone/app_src/* "$D/app.new"
  cp -a .next/standalone/node_modules "$D/app.new/node_modules" 2>/dev/null || true
else
  cp -a .next/standalone/* "$D/app.new" 2>/dev/null || cp -a .next/standalone "$D/app.new"
fi

mkdir -p "$D/app.new/.next"
cp -a .next/static "$D/app.new/.next/static"
cp -a public "$D/app.new/public"

if [ -f .env ]; then
  cp .env "$D/app.new/.env"
  chmod 600 "$D/app.new/.env"
elif [ -f "$D/app/.env" ]; then
  cp "$D/app/.env" "$D/app.new/.env"
  chmod 600 "$D/app.new/.env"
fi

mkdir -p "$D/app.new/tmp"

# Next's tracing does not reliably carry the Prisma engine into the bundle.
mkdir -p "$D/app.new/node_modules/.prisma" "$D/app.new/node_modules/@prisma"
[ -d "node_modules/.prisma/client" ] && cp -a node_modules/.prisma/client "$D/app.new/node_modules/.prisma/client"
[ -d "node_modules/@prisma/client" ] && cp -a node_modules/@prisma/client "$D/app.new/node_modules/@prisma/client"

if [ -f "$D/app/app.js" ]; then
  cp "$D/app/app.js" "$D/app.new/app.js"
elif [ -f "app.js" ]; then
  cp app.js "$D/app.new/app.js"
fi

echo "==> swapping in"
rm -rf "$D/app.old"
[ -d "$D/app" ] && mv "$D/app" "$D/app.old"
mv "$D/app.new" "$D/app"
touch "$D/app/tmp/restart.txt"

echo "==> done. previous build kept at app.old for rollback."
