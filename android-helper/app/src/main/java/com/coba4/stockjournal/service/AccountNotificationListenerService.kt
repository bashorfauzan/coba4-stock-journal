package com.coba4.stockjournal.service

import android.app.Notification
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class AccountNotificationListenerService : NotificationListenerService() {
    private lateinit var preferenceStore: PreferenceStore
    private lateinit var webhookSender: WebhookSender
    private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss")
        .withZone(ZoneId.systemDefault())

    override fun onCreate() {
        super.onCreate()
        preferenceStore = PreferenceStore(this)
        webhookSender = WebhookSender(preferenceStore)
        NotificationHelper.createChannel(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName ?: return
        val isSupported = SUPPORTED_PACKAGES.contains(packageName) ||
            packageName.contains("stock", ignoreCase = true) ||
            packageName.contains("trade", ignoreCase = true) ||
            packageName.contains("broker", ignoreCase = true) ||
            packageName.contains("ipot", ignoreCase = true) ||
            packageName.contains("ajaib", ignoreCase = true) ||
            packageName.contains("rhb", ignoreCase = true) ||
            packageName.contains("phillip", ignoreCase = true) ||
            packageName.contains("philip", ignoreCase = true) ||
            packageName.contains("poems", ignoreCase = true) ||
            packageName.contains("semesta", ignoreCase = true) ||
            packageName.contains("mirae", ignoreCase = true) ||
            packageName.contains("bcas", ignoreCase = true) ||
            packageName.contains("bions", ignoreCase = true)
        if (!isSupported) return

        val appNameStr = resolveAppName(packageName)
        val extras = sbn.notification.extras
        val title = firstNonBlank(
            extras.getCharSequence(Notification.EXTRA_TITLE)?.toString(),
            extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString(),
            extras.getCharSequence("android.title.big")?.toString()
        )
        val text = extractMessageText(sbn.notification, extras)
        val senderName = firstNonBlank(
            extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString(),
            extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString(),
            extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()
        )

        val messageText = when {
            text.isNotBlank() -> text
            title.isNotBlank() -> title
            else -> {
                preferenceStore.setLastDeliveryStatus("Diabaikan • isi notifikasi kosong")
                return
            }
        }

        val fullText = listOf(title, senderName, messageText)
            .plus(appNameStr)
            .plus(packageName)
            .joinToString(" ")
            .lowercase()
        val filters = preferenceStore.getFilterKeywords()
            .split(",")
            .map { it.trim().lowercase() }
            .filter { it.isNotBlank() }

        if (filters.isNotEmpty() && filters.none { keyword -> fullText.contains(keyword) }) {
            val timeStr = timeFormatter.format(Instant.ofEpochMilli(sbn.postTime))
            preferenceStore.setLastDeliveryStatus(
                "Diabaikan $timeStr • tidak cocok filter"
            )
            return
        }

        val payload = JSONObject().apply {
            put("appName", appNameStr)
            put("title", title)
            put("senderName", senderName)
            put("text", messageText)
            put("receivedAt", Instant.ofEpochMilli(sbn.postTime).toString())
            put(
                "rawPayload",
                JSONObject().apply {
                    put("packageName", packageName)
                    put("notificationKey", sbn.key)
                    put("groupKey", sbn.groupKey)
                    put("isGroup", sbn.isGroup)
                    put("postTime", sbn.postTime)
                    put("isClearable", sbn.isClearable)
                    put("tag", sbn.tag)
                    put("channelId", sbn.notification.channelId)
                    put("category", sbn.notification.category)
                    put("extrasKeys", extras.keySet().joinToString(","))
                    put("androidTitle", title)
                    put("androidText", text)
                }
            )
        }

        webhookSender.send(payload) {
            val webAppUrl = preferenceStore.getWebAppUrl()
            if (webAppUrl.isNotBlank()) {
                NotificationHelper.showTransactionNotification(
                    context = this,
                    webAppUrl = webAppUrl,
                    appName = appNameStr,
                    text = messageText
                )
            }
        }
    }

    companion object {
        private val SUPPORTED_PACKAGES = setOf(
            "com.ajaib",
            "com.stockbit.mobile",
            "com.rhb.trade.smart",
            "com.indopremier.ipot",
            "com.poems.mobile",
            "com.miraeasset.neo",
            "id.co.bions.mobile",
            "com.bcas.bestmobile"
        )

        private fun resolveAppName(packageName: String): String {
            return when {
                packageName.contains("ajaib", ignoreCase = true) -> "Ajaib"
                packageName.contains("stockbit", ignoreCase = true) -> "Stockbit"
                packageName.contains("rhb", ignoreCase = true) -> "RHB"
                packageName.contains("ipot", ignoreCase = true) -> "IPOT"
                packageName.contains("phillip", ignoreCase = true) || packageName.contains("philip", ignoreCase = true) || packageName.contains("poems", ignoreCase = true) -> "Phillip"
                packageName.contains("semesta", ignoreCase = true) -> "Semesta Sekuritas"
                packageName.contains("mirae", ignoreCase = true) -> "Mirae"
                packageName.contains("bions", ignoreCase = true) -> "BIONS"
                packageName.contains("bcas", ignoreCase = true) -> "BCAS"
                else -> packageName
            }
        }

        private fun firstNonBlank(vararg values: String?): String {
            return values.firstOrNull { !it.isNullOrBlank() }?.trim().orEmpty()
        }

        private fun joinTextLines(values: Array<CharSequence>?): String {
            return values
                ?.map { it.toString().trim() }
                ?.filter { it.isNotBlank() }
                ?.joinToString(" ")
                .orEmpty()
        }

        private fun extractMessageText(notification: Notification, extras: Bundle): String {
            return firstNonBlank(
                extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
                joinTextLines(extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)),
                joinMessagingTexts(extras.getParcelableArray(Notification.EXTRA_MESSAGES)),
                joinMessagingTexts(extras.getParcelableArray(Notification.EXTRA_HISTORIC_MESSAGES)),
                extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
                extras.getCharSequence("android.bigText")?.toString(),
                extras.getCharSequence("android.text")?.toString(),
                extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString(),
                notification.tickerText?.toString()
            )
        }

        private fun joinMessagingTexts(values: Array<android.os.Parcelable>?): String {
            if (values.isNullOrEmpty()) return ""

            return Notification.MessagingStyle.Message.getMessagesFromBundleArray(values)
                .mapNotNull { it.text?.toString()?.trim() }
                .filter { it.isNotBlank() }
                .distinct()
                .joinToString(" ")
        }
    }
}
