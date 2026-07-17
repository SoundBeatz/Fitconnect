# FitConnect User Engine 1.0

Status: complete
Branch: hostinger-static

## Runtime services

- `FitConnectProfileModel`
- `FitConnectUserService`
- `FitConnectAuthState`
- `FitConnectSessionManager`
- `FitConnectPermissions`
- `FitConnectRouteGuard`
- `FitConnectAuthFlows`
- `FitConnectAuthCallback`
- `FitConnectAccountDashboard`
- `FitConnectSettings`
- `FitConnectProfileEditor`
- `FitConnectAccountShell`
- `FitConnectSecurity`

## Required profile fields

The `profiles` table uses the authenticated user id as primary key. User-facing code must read and update profiles through `FitConnectUserService`.

## Account markup

- `[data-fc-dashboard]` mounts dashboard widgets.
- `[data-fc-settings-form]` mounts user settings.
- `[data-fc-profile-form]` mounts the profile editor.
- `[data-fc-account-shell]` mounts responsive account navigation.
- `[data-fc-current-session]` renders the current browser session.
- `[data-fc-security-events]` renders the security event history.

## Security events

Run `supabase/security-events.sql` in Supabase before enabling the security history view. The browser can only display and terminate its current Supabase session. Cross-device session revocation requires a trusted server or Supabase administrative function and is intentionally not implemented client-side.

## Architecture rules

1. Authentication state is read only through `FitConnectAuthState`.
2. Sign-out is handled only through `FitConnectSessionManager`.
3. Authorization uses `FitConnectPermissions` and server-side Row Level Security.
4. Route guards improve navigation but never replace database policies.
5. New business modules may register dashboard widgets but may not duplicate the account runtime.

## Release checklist

- Login, registration, recovery and callback flows tested.
- Protected and guest-only routes tested.
- Profile update and settings persistence tested.
- Permission rendering tested for every role.
- `security_events` migration applied and RLS verified.
- Keyboard, mobile and reduced-motion behavior checked.
