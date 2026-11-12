package com.morados.app.capacitor;

import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Native Morados host.
 *
 * Use the standard Android window-insets path so the IME (software keyboard)
 * can resize the WebView reliably across Android and System WebView versions.
 */
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceSettingsPlugin.class);
        super.onCreate(savedInstanceState);

        // Let Android lay out the WebView between the visible system bars.
        // Edge-to-edge/immersive mode is intentionally disabled here because
        // the login form must remain fully interactive while the IME is shown.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setSoftInputMode(
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        );
    }
}
