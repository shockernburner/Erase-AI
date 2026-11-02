# Play Console: Foreground service and VpnService declarations

**Status from versionCode 38 (1.0.9): none required.**

The app no longer declares any foreground service or `VpnService`. The optional
Strict network gate (`EgressGateService`), which was the only user of
`FOREGROUND_SERVICE_SPECIAL_USE` and `BIND_VPN_SERVICE`, was removed after
Google Play rejected an update under the VpnService policy ("Missing or
Incomplete Declaration"). `POST_NOTIFICATIONS` was removed with it.

## What to do in Play Console

1. Upload versionCode 38 or later to **every** track that has a release
   (internal, closed, open, production). Any older bundle still active on a
   track keeps declaring `VpnService`, and Google checks all tracks.
2. **App content → Foreground service permissions:** the declaration should no
   longer be requested once no active bundle uses the permission. If it is still
   shown, answer that the app does not use foreground services.
3. **App content → VPN service:** same; if still shown, state the app does not
   use `VpnService`.
4. Send the changes for review from **Publishing overview**.
