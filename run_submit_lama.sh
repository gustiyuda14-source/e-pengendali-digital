#!/bin/bash
# Wrapper: ambil kredensial e-Pengendalian (LAMA) dari macOS Keychain,
# lalu jalankan e_pengendalian_submit_v1_legacy.py tanpa perlu input manual.
#
# Kredensial disimpan via:
#   security add-generic-password -s "epengendalian-lama" -a "<email>" -w "<password>"
# Ubah kredensial: jalankan ulang perintah di atas dengan -U untuk overwrite.
set -euo pipefail
cd "$(dirname "$0")"

EPENGENDALIAN_EMAIL="gustiyuda14@gmail.com"
EPENGENDALIAN_PASS="$(security find-generic-password -s "epengendalian-lama" -a "$EPENGENDALIAN_EMAIL" -w)"
export EPENGENDALIAN_EMAIL EPENGENDALIAN_PASS

exec python3 e_pengendalian_submit_v1_legacy.py "$@"
