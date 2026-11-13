package com.morados.app.capacitor;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * O plugin SystemBars controla visibilidade e insets.
 * A Activity define somente a revelação temporária das barras por gesto do sistema.
 */
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeAuthPlugin.class);
        registerPlugin(DeviceSettingsPlugin.class);

        // Ativa edge-to-edge antes de a BridgeActivity criar a WebView e instalar
        // os listeners de WindowInsets do Capacitor/SystemBars.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
            getWindow(),
            getWindow().getDecorView()
        );
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
    }
}
