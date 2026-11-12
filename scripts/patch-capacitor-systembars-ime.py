#!/usr/bin/env python3
"""Apply the upstream Capacitor SystemBars fix for keyboard-overlay mode.

The stable @capacitor/android 8.6.0 release predates upstream commit
cb639cf5ec328cdf6fb32a419920cb3a1624aeb5 (PR #8619, merged 2026-11-11).
That fix teaches SystemBars to honor windowSoftInputMode="adjustNothing":
the IME does not pad the WebView and its insets are not forwarded to Chromium.
"""
from __future__ import annotations

import json
from pathlib import Path
import shutil

PACKAGE = Path("node_modules/@capacitor/android/package.json")
TARGET = Path(
    "node_modules/@capacitor/android/capacitor/src/main/java/"
    "com/getcapacitor/plugin/SystemBars.java"
)
VENDORED = Path("scripts/vendor/capacitor-android-8.6.0/SystemBars.java")
UPSTREAM_COMMIT = "cb639cf5ec328cdf6fb32a419920cb3a1624aeb5"

if not PACKAGE.is_file() or not TARGET.is_file() or not VENDORED.is_file():
    raise SystemExit("Não encontrei os arquivos do @capacitor/android necessários para o patch.")

version = json.loads(PACKAGE.read_text(encoding="utf-8")).get("version")
current = TARGET.read_text(encoding="utf-8")
required_markers = (
    "keyboardOverlaysWebView",
    "withoutOverlayingKeyboard",
    "getBottomInset(Insets systemBarsInsets, Insets imeInsets, boolean keyboardVisible)",
)

if all(marker in current for marker in required_markers):
    print(f"Capacitor SystemBars já contém a correção de IME ({version}).")
    raise SystemExit(0)

if version != "8.6.0":
    raise SystemExit(
        f"Patch bloqueado: esperado @capacitor/android 8.6.0, encontrado {version}. "
        "Verifique se a versão instalada já contém a correção upstream."
    )

patched = VENDORED.read_text(encoding="utf-8")
if not all(marker in patched for marker in required_markers):
    raise SystemExit("O arquivo vendorizado não contém todos os marcadores da correção upstream.")

TARGET.write_text(patched, encoding="utf-8")
verified = TARGET.read_text(encoding="utf-8")
if not all(marker in verified for marker in required_markers):
    raise SystemExit("Falha na validação da cópia do SystemBars corrigido.")

print(f"Aplicada correção upstream {UPSTREAM_COMMIT} ao @capacitor/android {version}.")
