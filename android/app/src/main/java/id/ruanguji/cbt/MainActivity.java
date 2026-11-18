package id.ruanguji.cbt;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.print.PrintManager;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.*;
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
    private LinearLayout rootLayout;
    private LinearLayout topBar;
    private TextView txtExamTitle;
    private TextView txtStudentInfo;
    private TextView txtTimer;
    private Button btnFinish;
    private CountDownTimer examTimer;

    private String pending;
    private ValueCallback<Uri[]> fileCallback;
    private boolean isExamActive = false;

    private int dp(int value) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (state != null) pending = state.getString("pending");

        rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(Color.WHITE);

        // TopBar for Exam Mode
        topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setBackgroundColor(0xFF102E4E); // Deep navy
        topBar.setPadding(dp(14), dp(8), dp(14), dp(8));
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setVisibility(View.GONE);

        // Info container (Title + Student)
        LinearLayout infoContainer = new LinearLayout(this);
        infoContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams infoParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        infoContainer.setLayoutParams(infoParams);

        txtExamTitle = new TextView(this);
        txtExamTitle.setTextColor(Color.WHITE);
        txtExamTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        txtExamTitle.setTypeface(Typeface.DEFAULT_BOLD);
        txtExamTitle.setText("ASAS 2026/2027");
        infoContainer.addView(txtExamTitle);

        txtStudentInfo = new TextView(this);
        txtStudentInfo.setTextColor(0xFFD2E3F0);
        txtStudentInfo.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        infoContainer.addView(txtStudentInfo);

        topBar.addView(infoContainer);

        // Timer
        txtTimer = new TextView(this);
        txtTimer.setTextColor(Color.WHITE);
        txtTimer.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        txtTimer.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        txtTimer.setPadding(dp(8), 0, dp(12), 0);
        topBar.addView(txtTimer);

        // Finish button
        btnFinish = new Button(this);
        btnFinish.setText("Akhiri Sesi");
        btnFinish.setTextColor(Color.WHITE);
        btnFinish.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        btnFinish.setBackgroundColor(0xFFDC2626); // Alert Red
        btnFinish.setPadding(dp(12), dp(4), dp(12), dp(4));
        btnFinish.setOnClickListener(v -> promptFinishExam());
        topBar.addView(btnFinish);

        rootLayout.addView(topBar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // WebView
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setUserAgentString(settings.getUserAgentString() + " Chrome/120.0.0.0 RuangUjiCBT/1.3");
        web.clearCache(true);

        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("https".equals(scheme) || "http".equals(scheme)) {
                    return false; // Load inside WebView, don't open external browser!
                }
                return true;
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

        rootLayout.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));
        setContentView(rootLayout);

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
            try {
                Object service = getSystemService("statusbar");
                Class<?> statusbarManager = Class.forName("android.app.StatusBarManager");
                java.lang.reflect.Method collapse = statusbarManager.getMethod("collapsePanels");
                collapse.invoke(service);
            } catch (Exception ignored) {}

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

    private void startNativeTimer(int totalSeconds) {
        if (examTimer != null) examTimer.cancel();
        examTimer = new CountDownTimer(totalSeconds * 1000L, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                long sec = millisUntilFinished / 1000;
                long m = sec / 60;
                long s = sec % 60;
                txtTimer.setText(String.format("%02d:%02d", m, s));
            }
            @Override
            public void onFinish() {
                txtTimer.setText("00:00");
                Toast.makeText(MainActivity.this, "Waktu ujian telah habis!", Toast.LENGTH_LONG).show();
            }
        }.start();
    }

    private void promptFinishExam() {
        final EditText input = new EditText(this);
        input.setHint("PIN Pengawas (default: 123456)");
        input.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        new AlertDialog.Builder(this)
            .setTitle("Akhiri Sesi Ujian")
            .setMessage("Pastikan seluruh jawaban telah terkirim. Minta pengawas memasukkan PIN untuk keluar:")
            .setView(input)
            .setNegativeButton("Batal", null)
            .setPositiveButton("Selesai & Keluar", (dialog, which) -> {
                String pin = input.getText().toString().trim();
                if ("123456".equals(pin)) {
                    stopExamSession();
                } else {
                    Toast.makeText(this, "PIN Pengawas salah! Minta bantuan pengawas.", Toast.LENGTH_SHORT).show();
                }
            })
            .show();
    }

    private void stopExamSession() {
        isExamActive = false;
        if (examTimer != null) {
            examTimer.cancel();
            examTimer = null;
        }
        topBar.setVisibility(View.GONE);
        ActivityManager am = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
        if (am != null && am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE) {
            try { stopLockTask(); } catch (Exception ignored) {}
        }
        web.loadUrl(ORIGIN + "/assets/index.html?mode=student");
        Toast.makeText(this, "Sesi ujian berhasil diselesaikan.", Toast.LENGTH_LONG).show();
    }

    private void handleMessage(String json) {
        try {
            JSONObject data = new JSONObject(json);
            switch (data.getString("action")) {
                case "scan":
                    new IntentIntegrator(this).setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
                        .setPrompt("Arahkan kamera ke Kode QR Ujian ASAS").setBeepEnabled(false).initiateScan();
                    break;
                case "startExam":
                    String url = data.getString("url");
                    String name = data.optString("name", "ASAS 2026/2027");
                    String person = data.optString("person", "");
                    String group = data.optString("class", "");
                    int minutes = data.optInt("minutes", 90);

                    isExamActive = true;
                    try { startLockTask(); } catch (Exception ignored) {}
                    hideSystemUI();

                    txtExamTitle.setText(name);
                    txtStudentInfo.setText(person + (group.isEmpty() ? "" : " · " + group));
                    topBar.setVisibility(View.VISIBLE);
                    startNativeTimer(minutes * 60);
                    web.loadUrl(url); // Directly loads Google Sites top-level, bypasses X-Frame-Options!
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
                        stopExamSession();
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
            promptFinishExam();
            return;
        }
        new AlertDialog.Builder(this)
            .setMessage("Keluar dari aplikasi ujian?")
            .setNegativeButton("Batal", null)
            .setPositiveButton("Keluar", (d, w) -> finish())
            .show();
    }
}
