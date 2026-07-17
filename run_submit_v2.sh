#!/bin/bash
# Wrapper: ambil kredensial e-Pengendalian Ver 2.0 dari macOS Keychain,
# lalu jalankan e_pengendalian_submit.py tanpa perlu input manual.
#
# Kredensial disimpan via:
#   security add-generic-password -s "epengendalian-v2" -a "<username>" -w "<password>"
# Ubah kredensial: jalankan ulang perintah di atas dengan -U untuk overwrite.
set -euo pipefail
cd "$(dirname "$0")"

EPENGENDALIAN_USER="admin_inspektorat"
EPENGENDALIAN_PASS="$(security find-generic-password -s "epengendalian-v2" -a "$EPENGENDALIAN_USER" -w)"
export EPENGENDALIAN_USER EPENGENDALIAN_PASS

exec python3 e_pengendalian_submit.py "$@"
