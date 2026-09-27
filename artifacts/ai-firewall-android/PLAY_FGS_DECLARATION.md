# Play Console: Foreground service permissions

**Type:** `FOREGROUND_SERVICE_SPECIAL_USE`, used only by `EgressGateService`
(subtype `ai_firewall_egress_gate`).

**Video:** built by `docs/marketing/video/build_play_fgs.py`. Upload it to
YouTube as Unlisted and paste the link.

## Description

EraseAI Firewall stops users from accidentally sending secrets (API keys,
passwords, card numbers, personal data) to AI chat apps such as ChatGPT, Claude
and Gemini. The special-use foreground service powers one optional feature, the
Strict network gate. It is off by default. The user turns it on in Settings,
which asks for notification permission and Android's VPN consent.

When EraseAI detects a risky prompt in a protected AI app, it starts the
foreground service. The service opens a local VPN that routes only the
protected AI apps and drops their packets on the device, so the prompt cannot
be sent in the background while the user decides. An ongoing notification,
"EraseAI is blocking AI app network", is shown for as long as it runs. The
service stops as soon as the user cancels, sanitizes or approves the prompt, or
leaves the app, usually within seconds. No packet is inspected, logged, stored
or forwarded. Other apps' traffic is not routed through the VPN.

## Why it can't be deferred or run otherwise

A send can happen within milliseconds of the prompt being detected, so the gate
must start immediately and stay up until the user decides. WorkManager, jobs or
alarms can be delayed by the system, and a VpnService must run as a foreground
service to stay alive while the user is in another app. Pausing or restarting it
later would let the held prompt leave the device. None of the standard
foreground service types covers a user-initiated, on-device network block for
data-loss prevention, so `specialUse` is declared with the subtype above.
