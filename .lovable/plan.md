
The user pasted a detailed self-authored launch review with three proposed prompts. They want me to: (1) review it for issues/errors, (2) assess if it's a better launch flow, (3) potentially research/refine it.

Key things to verify before forming a plan:
1. Is `Splash.tsx` actually dead code? (Confirmed from context — returns `null` unconditionally)
2. Does `/onboarding` route exist as a reset utility? Need to check App.tsx
3. Does `OnboardingOverlay` actually exist and run on `/home`? (Confirmed from Welcome.tsx)
4. Does `GalleryPlayground` vs `AuthenticatedHome` flag exist? (Confirmed)
5. Is there a `waitlist_signups` table? (NOT in the schema list — this is a factual error in the user's plan)
6. Is `DISCORD_INVITE` actually a placeholder in FoundingMembers? Need to verify
7. Does `delete-account` edge function exist? (Yes, in file list) — and is it surfaced in SettingsTab? (Yes — confirmed from ProfileSettings.tsx which calls `handleDeleteAccount` via supabase.functions.invoke('delete-account'). So Blocker 4 is FALSE — already done.)
8. BackgroundSwapOverlay createSignedUrl issue — verify
9. The "Supabase MCP wrong project" blocker is irrelevant to the app itself — user even acknowledges this

Let me check the key files to validate the plan's accuracy.
