package com.eraseai.firewall.data

/** Known consumer LLM / AI coding packages EraseAI can protect on Android. */
object KnownLlmApps {
  val labels: Map<String, String> = linkedMapOf(
    "com.openai.chatgpt" to "ChatGPT",
    "com.google.android.apps.bard" to "Gemini",
    "com.google.android.googlequicksearchbox" to "Google / Gemini",
    "com.anthropic.claude" to "Claude",
    "ai.deepseek" to "DeepSeek",
    "com.replit.app" to "Replit",
    "com.microsoft.copilot" to "Microsoft Copilot",
    "com.microsoft.bing" to "Microsoft Bing / Copilot",
    "ai.x.grok" to "Grok",
    "com.xai.grok" to "Grok",
    "com.perplexity.app" to "Perplexity",
    "com.quora.poe" to "Poe",
    "com.character.AI" to "Character.AI",
    "com.character.ai" to "Character.AI",
    "ai.character.app" to "Character.AI",
    "com.meta.ai" to "Meta AI",
    "com.facebook.orca" to "Messenger / Meta AI",
    "com.inflection.pi" to "Pi",
    "com.you.browser" to "You.com",
    "com.phind.android" to "Phind",
    "com.github.android" to "GitHub",
    "com.cursor.android" to "Cursor",
    "com.codeium" to "Codeium",
    "com.tabnine.android" to "Tabnine",
    "com.midjourney" to "Midjourney",
    "com.stability.clipdrop" to "Clipdrop",
    "com.adobe.firefly" to "Adobe Firefly",
    "com.notion.android.app" to "Notion AI",
    "md.obsidian" to "Obsidian",
    "com.slack" to "Slack",
    "com.discord" to "Discord",
  )

  val packages: Set<String> = labels.keys

  fun isKnown(packageName: String): Boolean = packages.contains(packageName)

  fun labelFor(packageName: String): String = labels[packageName] ?: packageName
}
