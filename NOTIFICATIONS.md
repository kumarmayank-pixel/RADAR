# RADAR deadline notifications

RADAR can show browser notifications when an active task moves between urgency zones:

- **Safe → Approaching:** the deadline reaches 48 hours remaining.
- **Approaching → Critical:** the deadline falls below 24 hours remaining.

## Enable alerts

1. Open RADAR over HTTPS (the published GitHub Pages site qualifies).
2. Sign in and select **Enable alerts** in the top bar.
3. Allow notifications when your browser asks.

Permission and the alert preference are stored per browser/device, so enable alerts separately on each device. The app must remain open for its countdown checker to detect a transition. Notifications are not delivered while the browser or RADAR is closed; persistent background delivery would require a service worker and push-notification service.

Tasks that are already Approaching or Critical when RADAR first loads do not generate a catch-up alert. Completed tasks do not generate urgency notifications.

The notification feature is included in the current `main` branch.
