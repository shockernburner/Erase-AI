package com.eraseai.firewall.safe

import com.eraseai.firewall.guard.LocalRiskScanner

/**
 * Decides which parts of an OCR'd page to black out. Kept free of Android types so it can be
 * tested without a device: the scanner runs over the page text as one string, with OCR line
 * breaks read as spaces — where a scanned line wraps is arbitrary, so a card number or key
 * split across lines must still be one match. Reading across a break can only over-redact.
 *
 * Each match becomes one rectangle per line rather than one box per word, and it is widened
 * towards the neighbouring words. OCR word boxes are tight, leave gaps between digit groups and
 * can start a full glyph late: per-word boxes let digits show between groups, and even a padded
 * box left the leading "4" of a card number readable to the AI.
 */
object OcrRedactionPlanner {

  data class Word(val text: String, val left: Int, val top: Int, val right: Int, val bottom: Int)

  data class Line(val words: List<Word>)

  data class Box(val left: Int, val top: Int, val right: Int, val bottom: Int)

  data class Plan(val boxes: List<Box>, val redactions: Int, val recognizedChars: Int)

  private data class Placed(val span: IntRange, val lineIndex: Int, val word: Word)

  fun plan(lines: List<Line>): Plan {
    val text = StringBuilder()
    val placed = mutableListOf<Placed>()
    lines.forEachIndexed { lineIndex, line ->
      if (lineIndex > 0) text.append(' ')
      line.words.forEachIndexed { wordIndex, word ->
        if (wordIndex > 0) text.append(' ')
        val start = text.length
        text.append(word.text)
        if (word.text.isNotEmpty()) placed.add(Placed(start until text.length, lineIndex, word))
      }
    }
    val ranges = LocalRiskScanner.piiRanges(text.toString())
    val boxes = ranges.flatMap { range ->
      placed
        .filter { range.first <= it.span.last && it.span.first <= range.last }
        .groupBy { it.lineIndex }
        .map { (lineIndex, words) -> widened(words.map { it.word }, lines[lineIndex].words) }
    }
    return Plan(boxes, ranges.size, text.count { !it.isWhitespace() })
  }

  /**
   * OCR sometimes splits one token ("accounts@rahim-traders.example.c" + "om"). A word that sits
   * almost flush against the match is treated as part of it, or the tail stayed readable.
   */
  private fun absorbFragments(match: List<Word>, lineWords: List<Word>): List<Word> {
    val sorted = lineWords.sortedBy { it.left }
    val height = (match.maxOf { it.bottom } - match.minOf { it.top }).coerceAtLeast(1)
    // A word space is ~0.25x the line height; OCR fragment splits sit much closer than that.
    val flush = (height * 0.2f).toInt()
    var first = sorted.indexOfFirst { it in match }
    var last = sorted.indexOfLast { it in match }
    if (first < 0) return match
    while (first > 0 && sorted[first].left - sorted[first - 1].right <= flush) first--
    while (last < sorted.lastIndex && sorted[last + 1].left - sorted[last].right <= flush) last++
    return sorted.subList(first, last + 1)
  }

  /**
   * Union of a match's words on one line, grown sideways by up to about one glyph and a half —
   * but never into the neighbouring word, so labels like "Card:" stay readable.
   */
  private fun widened(matchWords: List<Word>, lineWords: List<Word>): Box {
    val match = absorbFragments(matchWords, lineWords)
    val left = match.minOf { it.left }
    val right = match.maxOf { it.right }
    val top = match.minOf { it.top }
    val bottom = match.maxOf { it.bottom }
    val height = (bottom - top).coerceAtLeast(1)
    val reach = (height * 1.5f).toInt().coerceAtLeast(6)
    val gap = (height * 0.1f).toInt().coerceAtLeast(1)
    val previousRight = lineWords.filter { it !in match && it.right <= left }.maxOfOrNull { it.right }
    val nextLeft = lineWords.filter { it !in match && it.left >= right }.minOfOrNull { it.left }
    val padY = (height * 0.2f).toInt().coerceAtLeast(2)
    return Box(
      left = maxOf(left - reach, (previousRight ?: Int.MIN_VALUE / 2) + gap),
      top = top - padY,
      right = minOf(right + reach, (nextLeft ?: Int.MAX_VALUE / 2) - gap),
      bottom = bottom + padY,
    )
  }
}
