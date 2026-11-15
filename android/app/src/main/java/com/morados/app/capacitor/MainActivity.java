package com.morados.app.capacitor;

import android.os.Bundle;

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

        super.onCreate(savedInstanceState);

        // O Morados é um aplicativo, não uma página ampliável de navegador.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setSupportZoom(false);
            getBridge().getWebView().getSettings().setBuiltInZoomControls(false);
            getBridge().getWebView().getSettings().setDisplayZoomControls(false);
        }

        // Mantém o modo de tela cheia usado pela versão estável anterior.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
            getWindow(),
            getWindow().getDecorView()
        );
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
    }
}
