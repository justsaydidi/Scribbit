# Decision Log

This file tracks key product and engineering decisions with brief context.
Add new entries at the top.

## 2026-02-19 - App packaging for distribution
- Decision: Package Scribbit as standalone desktop apps for Windows and Mac using electron-builder.
- Context: Users need to install and run the app without using a terminal or npm.
- Implementation: Used electron-builder with portable target for Windows, configured icons (PNG, ICO, ICNS), and optimized build configuration to exclude unnecessary files.
- Output: Windows executable at `dist/win-unpacked/Scribbit.exe`, Mac requires macOS environment for .dmg build.

## 2026-02-19 - Reading view for Writing Library
- Decision: Create a beautiful, immersive reading view instead of a basic data view for past sessions.
- Context: Users want to re-read their writing in a distraction-free, book-like experience.
- Implementation: Full-screen reading view with centered text column (max 680px), Georgia font 20px/2.0 line-height, scroll progress bar, optional feedback panel, and export buttons. Content starts 25% down screen for comfortable reading.
- Files: `src/renderer/screens/reading.js`, `src/renderer/styles/reading.css`

## 2026-02-19 - Ambient sound during writing sessions
- Decision: Add optional background ambient sounds (Silence, Rain, Coffee Shop, White Noise) during writing.
- Context: Users requested background noise options to help focus during writing sessions.
- Implementation: Web Audio API-based sound generator with no external audio files. Four sound options in Settings with volume slider (0-100). Sounds loop seamlessly and start/stop automatically with writing sessions.
- Files: `src/renderer/ambient-sound.js` (sound generation), updates to Settings and Writing screens

## 2026-02-19 - Writing Pattern Intelligence
- Decision: Implement longitudinal AI analysis that identifies patterns across all user writing sessions.
- Context: Single-session feedback is helpful, but patterns across sessions provide deeper insights into writing habits and growth.
- Implementation: New "My Writing Patterns" feature in Library (unlocks at 5+ sessions). Sends all session text to AI with structured prompt requesting fingerprint, patterns serving user, patterns worth breaking, best writing contexts, and next challenge. Regenerated fresh each time.
- Files: Updated `src/renderer/screens/writings.js` with pattern analysis view

## 2026-02-19 - PDF Export functionality
- Decision: Add ability to export writing sessions as formatted PDFs in addition to TXT files.
- Context: Users want to share or archive their writing in a professional, readable format.
- Implementation: Uses puppeteer-core to generate A4 PDFs with proper styling (Georgia font, margins, headers with date/type, prompt display, optional AI feedback section). Available from Post-Session screen and individual session views.
- Files: `src/main/ipc.js` (PDF generation), updates to Post-Session and Writings screens

## 2026-02-19 - Demo mode for AI features
- Decision: Implement demo/sample responses when no API key is available or API quota is exceeded.
- Context: Users were getting stuck when API keys hit rate limits or weren't configured. Demo mode allows testing all UI flows without API access.
- Implementation: Added demo prompts, demo feedback, and demo pattern analysis to `src/main/ai.js`. System detects when no API key exists and returns sample responses instead of making API calls.
- Benefit: Users can explore the entire app experience even without API keys.

## 2026-02-18 - Onboarding profile setup screen
- Decision: Implement a calm, minimal, multi-step onboarding flow with tag-based selection and local persistence.
- Context: The onboarding screen should appear only on first launch, save profile data locally, and redirect to Home afterward.
- Notes: Optional prompt label matches "What's on your mind lately? (Optional — helps us give you better prompts)" and data is stored under `profile` and `settings.onboardingComplete`.
