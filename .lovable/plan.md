

# Add Network Error Help Message on Auth Page

## Overview

When users on restricted networks (e.g., school or corporate firewalls) encounter connection failures, they currently see a generic "Connection failed" message with a retry button. This change adds a more helpful, actionable message suggesting they try a different network.

## Changes

### File: `src/pages/Auth.tsx`

Update the existing retry/connection error block (the `showRetryButton` section) to include a more descriptive and helpful message:

- Replace the current generic text "Connection failed. Please check your internet connection." with a friendlier message that suggests specific actions:
  - Try connecting via mobile data or a personal hotspot
  - Try from a different Wi-Fi network (e.g., home network)
  - Contact their network administrator if the issue persists
- Keep the existing "Retry Connection" button as-is

The updated error block will look something like:

```
Connection issue detected

Your current network may be blocking access to our servers.
Try these steps:
  - Switch to mobile data or a personal hotspot
  - Connect from a different Wi-Fi network
  - Ask your network administrator to allow access

[Retry Connection]
```

This is a small, single-file UI text change with no logic modifications.

