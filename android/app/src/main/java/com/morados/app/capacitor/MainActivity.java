package com.morados.app.capacitor;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Capacitor host restored to the earlier simple Activity lifecycle.
 * No custom immersive-mode, focus, EdgeToEdge, or keyboard listeners.
 */
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeAuthPlugin.class);
        registerPlugin(DeviceSettingsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
