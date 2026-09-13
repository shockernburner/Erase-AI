---
name: Git provider versus connector authentication
description: Reauthorizing the GitHub connector may not repair shell Git authentication.
---
GitHub connector authorization and Replit Git Provider authorization can be separate. Do not assume reconnecting the connector repairs `git fetch`.

**Why:** A fetch still returned “Invalid username or token” after successful connector reauthorization. Official Replit documentation identifies Git Providers as a separate connection.

**How to apply:** After one failed retry with refreshed authorization, stop requesting connector reauthorization. Direct the user to reconnect GitHub under Replit account settings → Git Providers, then retry the fetch.