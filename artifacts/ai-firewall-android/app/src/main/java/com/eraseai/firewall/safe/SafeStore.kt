package com.eraseai.firewall.safe

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.OpenableColumns
import java.io.File
import java.security.MessageDigest

/**
 * Where EraseAI Safe gets its files:
 * - an inbox of originals the user shared into EraseAI (kept in app-private storage), and
 * - folders the user granted through the system folder picker (no broad storage permission).
 *
 * Originals never leave this store; only sanitized copies are served, built lazily at pick
 * time and cached by content fingerprint.
 */
class SafeStore(context: Context) {
  private val appContext = context.applicationContext
  private val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  val inboxDir: File get() = File(appContext.filesDir, "safe_inbox").apply { mkdirs() }
  private val cacheDir: File get() = File(appContext.cacheDir, "safe_out").apply { mkdirs() }

  fun inboxFiles(): List<File> = inboxDir.listFiles()?.filter { it.isFile }?.sortedByDescending { it.lastModified() }.orEmpty()

  enum class ImportResult { SAVED, UNSUPPORTED, UNREADABLE }

  /** Copies a shared stream into the inbox. */
  fun importToInbox(uri: Uri): ImportResult {
    val resolver = appContext.contentResolver
    val name = runCatching {
      resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
        if (c.moveToFirst()) c.getString(0) else null
      }
    }.getOrNull() ?: uri.lastPathSegment?.substringAfterLast('/') ?: "shared.txt"
    val mime = runCatching { resolver.getType(uri) }.getOrNull()
    if (!SafeSanitizer.supports(name, mime)) return ImportResult.UNSUPPORTED
    // A share without a usable name still deserves the right extension for the sanitizer.
    val storedName = if (name.contains('.')) name else "$name.${SafeSanitizer.outputType(name, mime)?.second ?: "txt"}"
    val target = uniqueInboxFile(storedName)
    val copied = runCatching {
      resolver.openInputStream(uri)?.use { input -> target.outputStream().use { input.copyTo(it) } }
    }.getOrNull()
    if (copied == null) {
      target.delete()
      return ImportResult.UNREADABLE
    }
    notifyChanged()
    return ImportResult.SAVED
  }

  fun importText(text: String): File {
    val target = uniqueInboxFile("shared-text-${System.currentTimeMillis() / 1000}.txt")
    target.writeText(text)
    notifyChanged()
    return target
  }

  fun deleteInboxFile(name: String) {
    File(inboxDir, name).takeIf { it.parentFile == inboxDir }?.delete()
    notifyChanged()
  }

  private fun uniqueInboxFile(name: String): File {
    val safeName = name.replace('/', '_').ifBlank { "file.txt" }
    var candidate = File(inboxDir, safeName)
    var index = 1
    while (candidate.exists()) {
      val base = safeName.substringBeforeLast('.', safeName)
      val ext = safeName.substringAfterLast('.', "").let { if (it.isEmpty()) "" else ".$it" }
      candidate = File(inboxDir, "$base ($index)$ext")
      index++
    }
    return candidate
  }

  fun grantedTrees(): List<Uri> =
    prefs.getStringSet(TREES_KEY, emptySet()).orEmpty().map(Uri::parse)
      .filter { tree -> appContext.contentResolver.persistedUriPermissions.any { it.uri == tree && it.isReadPermission } }

  fun addTree(tree: Uri) {
    appContext.contentResolver.takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION)
    prefs.edit().putStringSet(TREES_KEY, prefs.getStringSet(TREES_KEY, emptySet()).orEmpty() + tree.toString()).apply()
    notifyChanged()
  }

  fun removeTree(tree: Uri) {
    runCatching { appContext.contentResolver.releasePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
    prefs.edit().putStringSet(TREES_KEY, prefs.getStringSet(TREES_KEY, emptySet()).orEmpty() - tree.toString()).apply()
    notifyChanged()
  }

  fun treeDisplayName(tree: Uri): String = runCatching {
    val doc = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
    appContext.contentResolver.query(doc, arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)
      ?.use { c -> if (c.moveToFirst()) c.getString(0) else null }
  }.getOrNull() ?: "Folder"

  /**
   * Sanitized copy for [fingerprint], building it with [load] on a miss. The redaction count
   * is kept next to the output so listings can show it without redoing the work.
   */
  fun sanitized(
    fingerprint: String,
    displayName: String,
    mimeType: String?,
    load: () -> ByteArray?,
  ): Pair<File, SafeSanitizer.Output?>? {
    val key = sha256(fingerprint)
    val (_, ext) = SafeSanitizer.outputType(displayName, mimeType) ?: return null
    val out = File(cacheDir, "$key.$ext")
    val meta = File(cacheDir, "$key.count")
    if (out.exists() && meta.exists()) return out to null
    val source = load() ?: return null
    val result = if (SafeSanitizer.needsOcr(displayName, mimeType)) {
      SafeMediaRedactor.sanitize(appContext, displayName, mimeType, source)
    } else {
      SafeSanitizer.sanitize(displayName, mimeType, source)
    } ?: return null
    out.writeBytes(result.bytes)
    meta.writeText(result.redactions.toString())
    return out to result
  }

  fun cachedRedactions(fingerprint: String): Int? =
    File(cacheDir, "${sha256(fingerprint)}.count").takeIf { it.exists() }?.readText()?.trim()?.toIntOrNull()

  fun notifyChanged() {
    appContext.contentResolver.notifyChange(DocumentsContract.buildRootsUri(SafeDocumentsProvider.authority(appContext)), null)
    appContext.contentResolver.notifyChange(
      DocumentsContract.buildChildDocumentsUri(SafeDocumentsProvider.authority(appContext), SafeDocumentsProvider.ROOT_DOC_ID),
      null,
    )
  }

  /**
   * Cache keys include [REDACTION_VERSION]: an update that improves redaction must not keep
   * serving copies the older, weaker rules produced.
   */
  private fun sha256(value: String): String =
    MessageDigest.getInstance("SHA-256").digest("$REDACTION_VERSION:$value".toByteArray())
      .joinToString("") { "%02x".format(it) }

  private companion object {
    const val PREFS = "eraseai_safe_store"
    const val TREES_KEY = "granted_trees"
    /** Bump whenever scanner rules or redaction drawing change. */
    const val REDACTION_VERSION = 5
  }
}
