package com.eraseai.firewall.ime

import com.eraseai.firewall.guard.LocalRiskScanner

/** Pure decision logic for IME buffer evaluation — kept testable without InputConnection mocks. */
object ImeBufferPolicy {

  enum class Action {
    IDLE,
    SEND_SAFE,
    WITHHOLD,
  }

  fun evaluate(
    scan: LocalRiskScanner.LocalScan,
    bufferLength: Int,
    minBuffer: Int,
    commit: Boolean,
  ): Action {
    if (bufferLength < minBuffer) {
      return if (commit) Action.SEND_SAFE else Action.IDLE
    }
    return when {
      scan.shouldWarn -> Action.WITHHOLD
      commit -> Action.SEND_SAFE
      else -> Action.IDLE
    }
  }
}
