package com.eraseai.firewall.safe

import com.eraseai.firewall.safe.OcrRedactionPlanner.Line
import com.eraseai.firewall.safe.OcrRedactionPlanner.Word
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OcrRedactionPlannerTest {

  private fun line(y: Int, vararg words: String): Line {
    var x = 0
    return Line(words.map { w -> Word(w, x, y, x + w.length * 10, y + 20).also { x += w.length * 10 + 10 } })
  }

  @Test
  fun `only the sensitive words are covered`() {
    val plan = OcrRedactionPlanner.plan(
      listOf(
        line(0, "Contact:", "jane.doe@example.com"),
        line(40, "Next", "step:", "refund", "the", "charge."),
      ),
    )
    assertEquals(1, plan.boxes.size)
    val box = plan.boxes.single()
    // "Contact:" spans x 0..80, the email starts at 90: grow into the gap, not over the label.
    assertTrue(box.left > 80 && box.left < 90)
    assertTrue(box.bottom < 40)
    assertEquals(1, plan.redactions)
  }

  @Test
  fun `a card split into four ocr words becomes one gapless padded box`() {
    val plan = OcrRedactionPlanner.plan(listOf(line(0, "Card:", "4111", "1111", "1111", "1111")))
    assertEquals(1, plan.boxes.size)
    val box = plan.boxes.single()
    // Words run from x=60 to x=250; padding must extend past both glyph edges.
    assertTrue(box.left < 60)
    assertTrue(box.right > 250)
  }

  @Test
  fun `a match that wraps lines gets one box per line`() {
    val plan = OcrRedactionPlanner.plan(listOf(line(0, "Card", "4111", "1111"), line(40, "1111", "1111", "thanks")))
    assertEquals(1, plan.redactions)
    assertEquals(2, plan.boxes.size)
  }

  @Test
  fun `a page with no findings is left untouched`() {
    val plan = OcrRedactionPlanner.plan(listOf(line(0, "Quarterly", "roadmap", "draft")))
    assertTrue(plan.boxes.isEmpty())
    assertEquals(0, plan.redactions)
  }

  @Test
  fun `a box reaches about a glyph past a late-starting ocr box at the line edge`() {
    // OCR box for "4111" starts 20px late (x=80 instead of 60); nothing precedes it on the line.
    val words = listOf(Word("4111", 80, 0, 120, 20), Word("1111", 130, 0, 170, 20), Word("1111", 180, 0, 220, 20), Word("1111", 230, 0, 270, 20))
    val box = OcrRedactionPlanner.plan(listOf(Line(words))).boxes.single()
    assertTrue(box.left <= 60)
  }

  @Test
  fun `a fragment split off by ocr is covered with the match`() {
    // "a@b.example.c" + "om" 4px apart: the tail must not stay readable.
    val words = listOf(Word("Mail:", 0, 0, 50, 20), Word("accounts@rahim.example.c", 60, 0, 300, 20), Word("om", 304, 0, 324, 20), Word("thanks", 360, 0, 420, 20))
    val box = OcrRedactionPlanner.plan(listOf(Line(words))).boxes.single()
    assertTrue(box.right >= 324)
    assertTrue(box.right < 360)
    assertTrue(box.left > 50)
  }

  @Test
  fun `an ordinary word space is not absorbed as a fragment`() {
    // Height 44, normal space 12px: "Customer:" must stay readable.
    val words = listOf(Word("Customer:", 40, 0, 230, 44), Word("jane.doe@example.com", 242, 0, 720, 44))
    val box = OcrRedactionPlanner.plan(listOf(Line(words))).boxes.single()
    assertTrue(box.left > 230)
  }
}
