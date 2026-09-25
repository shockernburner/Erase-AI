package com.eraseai.firewall.safe

import android.content.Context
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import android.provider.DocumentsContract.Root
import android.provider.DocumentsProvider
import com.eraseai.firewall.R
import com.eraseai.firewall.guard.GuardLog
import java.io.File
import java.io.FileNotFoundException

/**
 * "EraseAI Safe" in the system file picker. ChatGPT, Gemini and Claude open that picker for
 * "Files"; choosing a document here hands the AI app a redacted copy instead of the original.
 *
 * Nothing is scanned ahead of time: a copy is built when a file is actually picked, so the
 * listing is always current and nothing is duplicated for files that never go to an AI.
 */
class SafeDocumentsProvider : DocumentsProvider() {

  private lateinit var store: SafeStore

  override fun onCreate(): Boolean {
    store = SafeStore(context ?: return false)
    return true
  }

  override fun queryRoots(projection: Array<out String>?): Cursor =
    MatrixCursor(projection ?: ROOT_PROJECTION).apply {
      newRow()
        .add(Root.COLUMN_ROOT_ID, ROOT_ID)
        .add(Root.COLUMN_DOCUMENT_ID, ROOT_DOC_ID)
        .add(Root.COLUMN_TITLE, SafeMarker.TAG)
        .add(Root.COLUMN_SUMMARY, "Redacted copies for AI apps")
        .add(Root.COLUMN_FLAGS, Root.FLAG_LOCAL_ONLY)
        .add(Root.COLUMN_ICON, R.drawable.eraseai_logo)
    }

  override fun queryDocument(documentId: String, projection: Array<out String>?): Cursor =
    MatrixCursor(projection ?: DOC_PROJECTION).apply {
      when (val ref = parse(documentId)) {
        is Ref.RootDir -> addDir(this, ROOT_DOC_ID, SafeMarker.TAG)
        is Ref.InboxFile -> addFile(this, documentId, ref.file.name, null, ref.file.lastModified(), detailed = true)
        is Ref.TreeItem -> treeItem(ref)?.let { item ->
          if (item.isDir) addDir(this, documentId, item.name) else
            addFile(this, documentId, item.name, item.mime, item.modified, detailed = true)
        } ?: throw FileNotFoundException(documentId)
      }
    }

  override fun queryChildDocuments(
    parentDocumentId: String,
    projection: Array<out String>?,
    sortOrder: String?,
  ): Cursor {
    val cursor = MatrixCursor(projection ?: DOC_PROJECTION)
    when (val ref = parse(parentDocumentId)) {
      is Ref.RootDir -> {
        store.grantedTrees().forEach { tree ->
          addDir(cursor, treeId(tree, DocumentsContract.getTreeDocumentId(tree)), store.treeDisplayName(tree))
        }
        store.inboxFiles().filter { SafeSanitizer.supports(it.name, null) }.forEach { file ->
          addFile(cursor, INBOX_PREFIX + file.name, file.name, null, file.lastModified(), detailed = false)
        }
      }
      is Ref.TreeItem -> treeChildren(ref).forEach { item ->
        val id = treeId(ref.tree, item.docId)
        if (item.isDir) addDir(cursor, id, item.name)
        else if (SafeSanitizer.supports(item.name, item.mime)) {
          addFile(cursor, id, item.name, item.mime, item.modified, detailed = false)
        }
      }
      is Ref.InboxFile -> Unit
    }
    context?.let { cursor.setNotificationUri(it.contentResolver, DocumentsContract.buildChildDocumentsUri(authority(it), parentDocumentId)) }
    return cursor
  }

  override fun openDocument(documentId: String, mode: String, signal: CancellationSignal?): ParcelFileDescriptor {
    GuardLog.event("safe.open", null, "mode=$mode")
    if (!mode.startsWith("r") || mode.contains('w')) throw UnsupportedOperationException("EraseAI Safe is read-only")
    val (file, displayName) = try {
      sanitizedFor(documentId) ?: throw FileNotFoundException("Cannot sanitize $documentId")
    } catch (err: Exception) {
      GuardLog.warn("safe.open.failed", null, "${err.javaClass.simpleName}: ${err.message}")
      throw err
    }
    context?.let { SafeServedRegistry.record(it, displayName) }
    GuardLog.event("safe.served", null, "name=$displayName redactions=${store.cachedRedactions(fingerprintOf(documentId) ?: "") ?: -1}")
    return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
  }

  override fun isChildDocument(parentDocumentId: String, documentId: String): Boolean =
    parentDocumentId == ROOT_DOC_ID || documentId.startsWith(parentDocumentId)

  // --- rows -----------------------------------------------------------------------------

  private fun addDir(cursor: MatrixCursor, id: String, name: String) {
    cursor.newRow()
      .add(Document.COLUMN_DOCUMENT_ID, id)
      .add(Document.COLUMN_DISPLAY_NAME, name)
      .add(Document.COLUMN_MIME_TYPE, Document.MIME_TYPE_DIR)
      .add(Document.COLUMN_FLAGS, 0)
      .add(Document.COLUMN_SIZE, null)
      .add(Document.COLUMN_LAST_MODIFIED, null)
  }

  /**
   * [detailed] rows (a single document, which is what an AI app queries after the pick) build
   * the sanitized copy so size and redaction count are exact. Listing rows stay cheap.
   */
  private fun addFile(
    cursor: MatrixCursor,
    id: String,
    originalName: String,
    mime: String?,
    modified: Long,
    detailed: Boolean,
  ) {
    val (outMime, outExt) = SafeSanitizer.outputType(originalName, mime) ?: return
    val fingerprint = fingerprintOf(id) ?: return
    var outSize: Long? = null
    if (detailed) outSize = sanitizedFor(id)?.first?.length()
    val redactions = store.cachedRedactions(fingerprint)
    cursor.newRow()
      .add(Document.COLUMN_DOCUMENT_ID, id)
      .add(Document.COLUMN_DISPLAY_NAME, SafeMarker.safeDisplayName(originalName, outExt))
      .add(Document.COLUMN_MIME_TYPE, outMime)
      .add(Document.COLUMN_FLAGS, 0)
      .add(Document.COLUMN_SIZE, outSize)
      .add(Document.COLUMN_LAST_MODIFIED, modified)
      .add(
        Document.COLUMN_SUMMARY,
        when (redactions) {
          null -> "Sensitive data is removed when attached"
          0 -> "Nothing sensitive found"
          1 -> "1 item redacted"
          else -> "$redactions items redacted"
        },
      )
  }

  // --- sources --------------------------------------------------------------------------

  private fun sanitizedFor(documentId: String): Pair<File, String>? {
    val fingerprint = fingerprintOf(documentId) ?: return null
    return when (val ref = parse(documentId)) {
      is Ref.InboxFile -> {
        val (_, ext) = SafeSanitizer.outputType(ref.file.name, null) ?: return null
        store.sanitized(fingerprint, ref.file.name, null) { ref.file.takeIf { it.exists() }?.readBytes() }
          ?.let { it.first to SafeMarker.safeDisplayName(ref.file.name, ext) }
      }
      is Ref.TreeItem -> {
        val item = treeItem(ref)?.takeIf { !it.isDir } ?: return null
        val (_, ext) = SafeSanitizer.outputType(item.name, item.mime) ?: return null
        val uri = DocumentsContract.buildDocumentUriUsingTree(ref.tree, ref.docId)
        store.sanitized(fingerprint, item.name, item.mime) {
          context?.contentResolver?.openInputStream(uri)?.use { it.readBytes() }
        }?.let { it.first to SafeMarker.safeDisplayName(item.name, ext) }
      }
      is Ref.RootDir -> null
    }
  }

  private fun fingerprintOf(documentId: String): String? = when (val ref = parse(documentId)) {
    is Ref.InboxFile -> "inbox:${ref.file.absolutePath}:${ref.file.length()}:${ref.file.lastModified()}"
    is Ref.TreeItem -> treeItem(ref)?.let { "tree:${ref.tree}:${ref.docId}:${it.size}:${it.modified}" }
    is Ref.RootDir -> null
  }

  private data class TreeEntry(
    val docId: String,
    val name: String,
    val mime: String?,
    val size: Long,
    val modified: Long,
  ) {
    val isDir: Boolean get() = mime == Document.MIME_TYPE_DIR
  }

  private fun treeItem(ref: Ref.TreeItem): TreeEntry? =
    queryTree(DocumentsContract.buildDocumentUriUsingTree(ref.tree, ref.docId)).firstOrNull()

  private fun treeChildren(ref: Ref.TreeItem): List<TreeEntry> =
    queryTree(DocumentsContract.buildChildDocumentsUriUsingTree(ref.tree, ref.docId))

  private fun queryTree(uri: Uri): List<TreeEntry> = runCatching {
    context!!.contentResolver.query(uri, TREE_COLUMNS, null, null, null)?.use { c ->
      buildList {
        while (c.moveToNext()) {
          add(
            TreeEntry(
              docId = c.getString(0),
              name = c.getString(1) ?: "file",
              mime = c.getString(2),
              size = if (c.isNull(3)) -1 else c.getLong(3),
              modified = if (c.isNull(4)) 0 else c.getLong(4),
            ),
          )
        }
      }
    }.orEmpty()
  }.getOrDefault(emptyList())

  // --- ids ------------------------------------------------------------------------------

  private sealed interface Ref {
    data object RootDir : Ref
    data class InboxFile(val file: File) : Ref
    data class TreeItem(val tree: Uri, val docId: String) : Ref
  }

  private fun parse(documentId: String): Ref = when {
    documentId == ROOT_DOC_ID -> Ref.RootDir
    documentId.startsWith(INBOX_PREFIX) -> {
      val file = File(store.inboxDir, documentId.removePrefix(INBOX_PREFIX))
      if (file.parentFile != store.inboxDir) throw FileNotFoundException(documentId)
      Ref.InboxFile(file)
    }
    documentId.startsWith(TREE_PREFIX) -> {
      val (tree, doc) = documentId.removePrefix(TREE_PREFIX).split('|', limit = 2)
        .takeIf { it.size == 2 } ?: throw FileNotFoundException(documentId)
      val treeUri = Uri.parse(Uri.decode(tree))
      // Only folders the user granted may be read through us.
      if (store.grantedTrees().none { it == treeUri }) throw FileNotFoundException(documentId)
      Ref.TreeItem(treeUri, Uri.decode(doc))
    }
    else -> throw FileNotFoundException(documentId)
  }

  private fun treeId(tree: Uri, docId: String): String =
    TREE_PREFIX + Uri.encode(tree.toString()) + "|" + Uri.encode(docId)

  companion object {
    const val ROOT_ID = "eraseai_safe"
    const val ROOT_DOC_ID = "root"
    private const val INBOX_PREFIX = "inbox:"
    private const val TREE_PREFIX = "tree:"

    fun authority(context: Context): String = "${context.packageName}.safe"

    private val ROOT_PROJECTION = arrayOf(
      Root.COLUMN_ROOT_ID, Root.COLUMN_DOCUMENT_ID, Root.COLUMN_TITLE,
      Root.COLUMN_SUMMARY, Root.COLUMN_FLAGS, Root.COLUMN_ICON,
    )
    private val DOC_PROJECTION = arrayOf(
      Document.COLUMN_DOCUMENT_ID, Document.COLUMN_DISPLAY_NAME, Document.COLUMN_MIME_TYPE,
      Document.COLUMN_FLAGS, Document.COLUMN_SIZE, Document.COLUMN_LAST_MODIFIED, Document.COLUMN_SUMMARY,
    )
    private val TREE_COLUMNS = arrayOf(
      Document.COLUMN_DOCUMENT_ID, Document.COLUMN_DISPLAY_NAME, Document.COLUMN_MIME_TYPE,
      Document.COLUMN_SIZE, Document.COLUMN_LAST_MODIFIED,
    )
  }
}
