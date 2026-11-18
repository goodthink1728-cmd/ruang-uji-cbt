package id.ruanguji.cbt;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
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

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
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
        web.loadUrl(ORIGIN + "/assets/index.html");
    }
    private void handleMessage(String json) {
        try {
            JSONObject data = new JSONObject(json);
            switch (data.getString("action")) {
                case "scan":
                    new IntentIntegrator(this).setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
                        .setPrompt("Pindai kode ujian").setBeepEnabled(false).initiateScan();
                    break;
                case "print":
                    ((PrintManager)getSystemService(PRINT_SERVICE)).print("Kartu ujian", web.createPrintDocumentAdapter("Kartu ujian"), null);
                    break;
                case "session":
                    if (data.getBoolean("active")) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    else {
                        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                        android.app.ActivityManager am = (android.app.ActivityManager)getSystemService(ACTIVITY_SERVICE);
                        if (am.getLockTaskModeState() != android.app.ActivityManager.LOCK_TASK_MODE_NONE) stopLockTask();
                    }
                    break;
                case "pin": startLockTask(); break;
                case "save":
                    pending = data.getString("data");
                    startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/octet-stream")
                        .addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE, "ujian.cbt"), SAVE);
                    break;
            }
        } catch (Exception error) { Toast.makeText(this, "Fitur perangkat tidak tersedia.", Toast.LENGTH_LONG).show(); }
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
    @Override public void onBackPressed() {
        web.evaluateJavascript("document.querySelector('dialog[open]') ? document.querySelector('dialog').close() : document.querySelector('[data-act=finish]')?.click()",null);
        web.evaluateJavascript("document.querySelector('#timer') === null && !document.querySelector('dialog[open]')", value -> {
            if ("true".equals(value)) new android.app.AlertDialog.Builder(this).setMessage("Keluar dari RuangUji?")
                .setNegativeButton("Batal",null).setPositiveButton("Keluar",(d,w)->finish()).show();
        });
    }
}
