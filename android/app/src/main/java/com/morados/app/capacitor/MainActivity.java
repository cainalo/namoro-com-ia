package com.morados.app.capacitor;

import android.os.Bundle;
import android.view.WindowManager;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

/**
 * Native Morados host.
 *
 * Capacitor SystemBars owns system/IME insets. EdgeToEdge.enable is the
 * AndroidX integration expected by Capacitor 8 on modern Android versions.
 */
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceSettingsPlugin.class);
        super.onCreate(savedInstanceState);

        // Enable the platform's standard edge-to-edge/insets dispatch. The
        // Capacitor SystemBars plugin (insetsHandling="native") then applies
        // exactly one set of system/IME insets to the WebView.
        EdgeToEdge.enable(this);

        // Keep Android's standard IME resize behavior for focused web inputs.
        getWindow().setSoftInputMode(
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        );
    }
}
