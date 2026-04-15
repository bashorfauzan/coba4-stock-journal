package com.coba4.stockjournal

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.coba4.stockjournal.databinding.ActivityWebAppBinding
import com.coba4.stockjournal.service.PreferenceStore
import org.json.JSONObject

class WebAppActivity : AppCompatActivity() {
    private lateinit var binding: ActivityWebAppBinding
    private lateinit var webAppUrl: String
    private lateinit var preferenceStore: PreferenceStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityWebAppBinding.inflate(layoutInflater)
        setContentView(binding.root)
        preferenceStore = PreferenceStore(this)

        webAppUrl = intent.getStringExtra(EXTRA_WEB_APP_URL).orEmpty()
        if (!isValidHttpUrl(webAppUrl)) {
            preferenceStore.setLastWebAppStatus("Status Web App: URL tidak valid ($webAppUrl)")
            Toast.makeText(this, R.string.web_app_invalid_url, Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        preferenceStore.setLastWebAppStatus("Status Web App: memuat $webAppUrl")

        binding.openBrowserButton.setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(webAppUrl)))
        }
        binding.reloadButton.setOnClickListener { binding.webView.reload() }
        binding.closeButton.setOnClickListener { finish() }

        setupWebView()
        binding.webView.clearCache(true)
        binding.webView.clearHistory()
        binding.webView.loadUrl(webAppUrl)
    }

    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
            return
        }
        super.onBackPressed()
    }

    @Suppress("SetJavaScriptEnabled")
    private fun setupWebView() {
        binding.webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            allowFileAccess = false
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_NO_CACHE
        }
        binding.webView.addJavascriptInterface(NovaNativeJsBridge(), JS_BRIDGE_NAME)
        binding.webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                binding.loadingBar.progress = newProgress
                binding.loadingBar.visibility = if (newProgress >= 100) android.view.View.GONE else android.view.View.VISIBLE
            }

            override fun onJsAlert(view: WebView?, url: String?, message: String?, result: android.webkit.JsResult?): Boolean {
                android.app.AlertDialog.Builder(this@WebAppActivity)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm() }
                    .setCancelable(false)
                    .create()
                    .show()
                return true
            }

            override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: android.webkit.JsResult?): Boolean {
                android.app.AlertDialog.Builder(this@WebAppActivity)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm() }
                    .setNegativeButton(android.R.string.cancel) { _, _ -> result?.cancel() }
                    .setCancelable(false)
                    .create()
                    .show()
                return true
            }

            override fun onJsPrompt(view: WebView?, url: String?, message: String?, defaultValue: String?, result: android.webkit.JsPromptResult?): Boolean {
                val input = android.widget.EditText(this@WebAppActivity)
                input.setText(defaultValue)
                android.app.AlertDialog.Builder(this@WebAppActivity)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm(input.text.toString()) }
                    .setNegativeButton(android.R.string.cancel) { _, _ -> result?.cancel() }
                    .setCancelable(false)
                    .create()
                    .show()
                return true
            }
        }
        binding.webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString().orEmpty()
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false
                }

                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                } catch (_: Exception) {
                    false
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                preferenceStore.setLastWebAppStatus("Status Web App: berhasil memuat ${url ?: webAppUrl}")
                injectNativeBridge()
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: android.webkit.WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    val msg = getString(R.string.web_app_load_failed) + " (" + (error?.description ?: "Unknown") + ")"
                    preferenceStore.setLastWebAppStatus("Status Web App: $msg")
                    Toast.makeText(this@WebAppActivity, msg, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun injectNativeBridge() {
        binding.webView.evaluateJavascript(
            """
            (function () {
              if (window.NovaNativeBridge && window.NovaNativeBridge.__androidReady) {
                return;
              }
              window.NovaNativeBridge = {
                __androidReady: true,
                openAccountApp: function (payload) {
                  try {
                    ${JS_BRIDGE_NAME}.openAccountApp(JSON.stringify(payload || {}));
                    return Promise.resolve({ ok: true });
                  } catch (error) {
                    return Promise.resolve({ ok: false, message: String(error) });
                  }
                }
              };
            })();
            """.trimIndent(),
            null
        )
    }

    private fun isValidHttpUrl(value: String): Boolean {
        if (value.isBlank()) return false
        val parsed = Uri.parse(value)
        return parsed.scheme == "http" || parsed.scheme == "https"
    }

    private inner class NovaNativeJsBridge {
        @JavascriptInterface
        fun openAccountApp(payloadJson: String) {
            runOnUiThread {
                handleAccountAppLaunch(payloadJson)
            }
        }
    }

    private fun handleAccountAppLaunch(payloadJson: String) {
        val payload = runCatching { JSONObject(payloadJson) }.getOrNull()
        val deepLink = payload?.optString("deepLink")?.takeIf { !it.isNullOrBlank() }
        val packageName = payload?.optString("packageName")?.takeIf { !it.isNullOrBlank() }
        val storeUrl = payload?.optString("storeUrl")?.takeIf { !it.isNullOrBlank() }

        if (deepLink != null && openIntent(Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)))) {
            Toast.makeText(this, R.string.account_app_opened, Toast.LENGTH_SHORT).show()
            return
        }

        if (packageName != null) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null && openIntent(launchIntent)) {
                Toast.makeText(this, R.string.account_app_opened, Toast.LENGTH_SHORT).show()
                return
            }
        }

        if (storeUrl != null && openIntent(Intent(Intent.ACTION_VIEW, Uri.parse(storeUrl)))) {
            Toast.makeText(this, R.string.account_store_opened, Toast.LENGTH_SHORT).show()
            return
        }

        Toast.makeText(this, R.string.account_open_failed, Toast.LENGTH_SHORT).show()
    }

    private fun openIntent(intent: Intent): Boolean {
        return try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent.resolveActivity(packageManager) == null) {
                false
            } else {
                startActivity(intent)
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    companion object {
        private const val EXTRA_WEB_APP_URL = "web_app_url"
        private const val JS_BRIDGE_NAME = "NovaAndroidBridge"

        fun createIntent(context: Context, webAppUrl: String): Intent {
            return Intent(context, WebAppActivity::class.java)
                .putExtra(EXTRA_WEB_APP_URL, webAppUrl)
        }
    }
}
