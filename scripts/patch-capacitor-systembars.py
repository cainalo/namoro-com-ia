#!/usr/bin/env python3
"""Apply the keyboard-overlap fix from ionic-team/capacitor PR #8619.

The app keeps Bun's 24-hour minimum-release-age guard active. This ports the
small upstream SystemBars change onto the exact Capacitor version in bun.lock,
without excluding a newly published package from the supply-chain guard.
"""
from pathlib import Path

source_path = Path(
    "node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/plugin/SystemBars.java"
)
if not source_path.is_file():
    raise SystemExit(f"Capacitor SystemBars source not found: {source_path}")

source = source_path.read_text(encoding="utf-8")
if "keyboardOverlaysWebView" in source:
    print("Capacitor SystemBars already contains the adjustNothing keyboard fix.")
    raise SystemExit(0)


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(
            f"Cannot apply Capacitor SystemBars patch ({label}): "
            f"expected one match, found {count}. Dependency source changed."
        )
    source = source.replace(old, new, 1)


replace_once(
    "import android.view.Window;\n",
    "import android.view.Window;\nimport android.view.WindowManager;\n",
    "WindowManager import",
)

replace_once(
    """            Insets imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime());
            boolean keyboardVisible = insets.isVisible(WindowInsetsCompat.Type.ime());""",
    """            Insets imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime());
            // With adjustNothing the keyboard overlays the WebView, so handle it as if it is not there.
            boolean keyboardOverlaysWebView =
                (getActivity().getWindow().getAttributes().softInputMode & WindowManager.LayoutParams.SOFT_INPUT_MASK_ADJUST) ==
                WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING;
            boolean keyboardVisible = !keyboardOverlaysWebView && insets.isVisible(WindowInsetsCompat.Type.ime());""",
    "keyboard mode detection",
)

replace_once(
    """                WindowInsetsCompat newInsets = new WindowInsetsCompat.Builder(insets)
                    .setInsets(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(),
                        Insets.of(
                            systemBarsInsets.left,
                            systemBarsInsets.top,
                            systemBarsInsets.right,
                            getBottomInset(systemBarsInsets, keyboardVisible)
                        )
                    )
                    .build();""",
    """                WindowInsetsCompat newInsets = withoutOverlayingKeyboard(
                    new WindowInsetsCompat.Builder(insets).setInsets(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(),
                        Insets.of(
                            systemBarsInsets.left,
                            systemBarsInsets.top,
                            systemBarsInsets.right,
                            getBottomInset(systemBarsInsets, keyboardVisible)
                        )
                    ),
                    keyboardOverlaysWebView
                ).build();""",
    "passthrough insets handling",
)

replace_once(
    """            WindowInsetsCompat newInsets = new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(), Insets.of(0, 0, 0, 0))
                .build();""",
    """            WindowInsetsCompat newInsets = withoutOverlayingKeyboard(
                new WindowInsetsCompat.Builder(insets).setInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(),
                    Insets.of(0, 0, 0, 0)
                ),
                keyboardOverlaysWebView
            ).build();""",
    "native insets handling",
)

replace_once(
    "    private void injectSafeAreaCSS(WindowInsetsCompat insets) {",
    """    private WindowInsetsCompat.Builder withoutOverlayingKeyboard(
        WindowInsetsCompat.Builder builder,
        boolean keyboardOverlaysWebView
    ) {
        if (!keyboardOverlaysWebView) {
            return builder;
        }

        // WebView >= 139 shrinks its visual viewport for IME insets. Zero them
        // without consuming them so the WebView remains stable and keyboard
        // events still fire for the app's focused-field scroll handling.
        return builder
            .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
            .setVisible(WindowInsetsCompat.Type.ime(), false);
    }

    private void injectSafeAreaCSS(WindowInsetsCompat insets) {""",
    "IME insets opt-out helper",
)

if source.count("keyboardOverlaysWebView") != 6:
    raise SystemExit(
        "Capacitor keyboard-insets patch verification failed: "
        f"found {source.count('keyboardOverlaysWebView')} marker occurrences."
    )

source_path.write_text(source, encoding="utf-8")
print("Applied the upstream Capacitor PR #8619 adjustNothing keyboard fix.")
