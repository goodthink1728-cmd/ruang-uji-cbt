package id.ruanguji.cbt;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
import android.view.View;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import org.json.JSONObject;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int OPEN = 11, SAVE = 12;
    private WebView web;
    private String pending;
    private ValueCallback<Uri[]> fileCallback;
    private boolean isExamActive = false;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        // Anti screenshot, screen recording, and app switcher preview
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        // Keep screen on during exam
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (state != null) pending = state.getString("pending");
        web = new WebView(this);
        web.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.clearCache(true);

        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"https".equals(uri.getScheme())) return true;
                return request.isForMainFrame() && !uri.toString().startsWith(ORIGIN + "/assets/index.html");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE).setType("*/*"), OPEN);
                return true;
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "NativeShell", Collections.singleton(ORIGIN),
                (view, message, origin, mainFrame, reply) -> {
                    if (mainFrame) handleMessage(message.getData());
                });
        }
        hideSystemUI();
        web.loadUrl(ORIGIN + "/assets/index.html?mode=student");
    }

    private void hideSystemUI() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        } else if (isExamActive) {
            // Collapse notification drawer if pulled down
            try {
                Object service = getSystemService("statusbar");
                Class<?> statusbarManager = Class.forName("android.app.StatusBarManager");
                java.lang.reflect.Method collapse = statusbarManager.getMethod("collapsePanels");
                collapse.invoke(service);
            } catch (Exception ignored) {}

            // Force app back to front immediately
            bringToFront();
            playWarningSound();
            Toast.makeText(this, "PERINGATAN: Dilarang beralih ke aplikasi lain saat ujian!", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (isExamActive) {
            bringToFront();
        }
    }

    private void bringToFront() {
        try {
            ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            if (am != null) {
                am.moveTaskToFront(getTaskId(), ActivityManager.MOVE_TASK_WITH_HOME);
            }
        } catch (Exception ignored) {}
    }

    private void playWarningSound() {
        try {
            Uri notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            Ringtone r = RingtoneManager.getRingtone(getApplicationContext(), notification);
            if (r != null) r.play();
        } catch (Exception ignored) {}
    }

    private void handleMessage(String json) {
        try {
            JSONObject data = new JSONObject(json);
            switch (data.getString("action")) {
                case "scan":
                    new IntentIntegrator(this).setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
                        .setPrompt("Pindai kode QR ujian dari pengawas").setBeepEnabled(false).initiateScan();
                    break;
                case "print":
                    ((PrintManager)getSystemService(PRINT_SERVICE)).print("Kartu ujian", web.createPrintDocumentAdapter("Kartu ujian"), null);
                    break;
                case "session":
                    boolean active = data.getBoolean("active");
                    isExamActive = active;
                    if (active) {
                        try { startLockTask(); } catch (Exception ignored) {}
                        hideSystemUI();
                    } else {
                        ActivityManager am = (ActivityManager)getSystemService(ACTIVITY_SERVICE);
                        if (am != null && am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE) {
                            try { stopLockTask(); } catch (Exception ignored) {}
                        }
                    }
                    break;
                case "pin":
                    try { startLockTask(); } catch (Exception ignored) {}
                    break;
                case "save":
                    pending = data.getString("data");
                    startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/octet-stream")
                        .addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE, "ujian.cbt"), SAVE);
                    break;
            }
        } catch (Exception error) {
            Toast.makeText(this, "Fitur perangkat tidak tersedia.", Toast.LENGTH_LONG).show();
        }
    }

    @Override public void onSaveInstanceState(Bundle state) {super.onSaveInstanceState(state);state.putString("pending", pending);}
    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == OPEN && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData()!=null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        } else if (code == SAVE) {
            if (result == RESULT_OK && data != null && pending != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData())) {
                    output.write(pending.getBytes(StandardCharsets.UTF_8));
                } catch (Exception error) { Toast.makeText(this,"File gagal disimpan.",Toast.LENGTH_LONG).show(); }
            }
            pending = null;
        } else {
            IntentResult scan = IntentIntegrator.parseActivityResult(code,result,data);
            if (scan != null && scan.getContents()!=null) web.evaluateJavascript("window.ruangScanResult("+JSONObject.quote(scan.getContents())+")",null);
        }
    }

    @Override
    public void onBackPressed() {
        if (isExamActive) {
            Toast.makeText(this, "Aplikasi terkunci. Minta pengawas memasukkan PIN untuk mengakhiri ujian.", Toast.LENGTH_SHORT).show();
            web.evaluateJavascript("document.querySelector('[data-act=finish]')?.click()", null);
            return;
        }
        new AlertDialog.Builder(this)
            .setMessage("Keluar dari aplikasi ujian?")
            .setNegativeButton("Batal", null)
            .setPositiveButton("Keluar", (d, w) -> finish())
            .show();
    }
}
