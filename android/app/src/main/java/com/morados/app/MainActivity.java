package com.morados.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
    private static final String HOME_URL = "https://morados.netlify.app/";
    private static final String SUPABASE_HOST = "jffryzeelzxjqbeagecb.supabase.co";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(15, 76, 92));
        window.setNavigationBarColor(Color.rgb(247, 239, 223));
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(247, 239, 223));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSafeBrowsingEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " MoradosAndroid/1.0");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }

            @Override
            public void onReceivedError(
                WebView view,
                WebResourceRequest request,
                WebResourceError error
            ) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    showOfflineMessage();
                }
            }
        });

        setContentView(webView);

        if (savedInstanceState != null && webView.restoreState(savedInstanceState) != null) {
            return;
        }
        webView.loadUrl(HOME_URL);
    }

    private boolean handleNavigation(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();

        if ("https".equals(scheme) && (
            "morados.netlify.app".equals(host) ||
            SUPABASE_HOST.equals(host)
        )) {
            return false;
        }

        if ("mailto".equals(scheme) || "tel".equals(scheme) || "sms".equals(scheme)) {
            openExternal(uri);
            return true;
        }

        if ("http".equals(scheme) || "https".equals(scheme)) {
            openExternal(uri);
            return true;
        }

        return true;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // No aplicativo não há ação alternativa segura para esquemas externos.
        }
    }

    private void showOfflineMessage() {
        String html = "<!doctype html><html lang='pt-BR'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
            "<meta name='theme-color' content='#0F4C5C'><title>Morados sem conexão</title>" +
            "<body style='margin:0;min-height:100vh;display:grid;place-items:center;background:#F7EFDF;color:#10282E;font:16px system-ui;padding:24px'>" +
            "<main style='max-width:360px;background:#FFF9EF;border:1px solid #D9C9AF;border-top:5px solid #C8402A;border-radius:12px;padding:28px'>" +
            "<h1 style='font-family:Georgia,serif'>Morados</h1><p style='color:#52646A;line-height:1.6'>Não foi possível conectar. Verifique sua internet e tente novamente.</p>" +
            "<button onclick=\"location.href='" + HOME_URL + "'\" style='min-height:44px;border:0;border-radius:6px;background:#0F4C5C;color:white;padding:0 18px;font-weight:700'>Tentar novamente</button>" +
            "</main></body></html>";
        webView.loadDataWithBaseURL(HOME_URL, html, "text/html", "UTF-8", HOME_URL);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
