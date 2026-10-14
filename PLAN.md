# ClassroomIQ frontend: bug audit and v2 plan

## What the app is

ClassroomIQ watches attention in a live class. An institution admin registers, adds teachers and students, and sets detection thresholds. A teacher starts a session and gets a six-character code. Students join with the code, allow the camera, and five in-browser detectors (blink, head pose, pupil, micro-expression, productive struggle) run in iframes from `public/`. Only attention scores go to the teacher over Socket.IO.

- Stack: React 18, Vite 5, React Router 6, axios, socket.io-client, lucide-react, react-hot-toast.
- Backend: separate repo `anujkumarsharma1/backend` (Express, MongoDB, Socket.IO). Nothing in this repo works without it.
- Run: `npm ci`, copy `.env.example` to `.env`, `npm run dev` (port 5173, proxies `/api` and `/socket.io` to `localhost:5000`).
- Build: `npm run build` to `dist/`; the Dockerfile serves `dist/` with nginx.

## How it was tested

The backend was run locally against an in-memory MongoDB, seeded with one admin, one teacher and one student. Every route was opened in Playwright at 1440 px and 390 px, with axe on desktop. The Azure backend in the backend repo's workflow (`classroomiqbackend.azurewebsites.net`) did not answer on Oct 14, 2026.

Baseline axe (13 routes, desktop): 34 rule failures, 327 nodes. No console errors on any route.

## Bugs

### Build and tooling
1. `npm run lint` fails: no ESLint config exists, so the lint script can never pass. Repro: `npm run lint`.
2. Build warns about duplicate `border` keys: `src/pages/admin/AdminDashboard.jsx:25` and `src/pages/teacher/TeacherDashboard.jsx:18` (`S.btn`). The second key silently wins.
3. `recharts` and `date-fns` are installed and `recharts` has its own chunk in `vite.config.js:24`, but neither is imported anywhere. The `charts` chunk is 30 bytes.

### Auth and API
4. A wrong password reloads the login page and the error never shows. `src/utils/api.js:22` hard-redirects to `/login` on every 401, and `/auth/login` and `/auth/admin-login` answer 401 for bad credentials. Repro: sign in with a wrong password.
5. Production builds call `http://localhost:5000` when `VITE_API_URL` is unset (`src/utils/api.js:3`). That is fine for dev, but it is not documented anywhere except `.env.example`.
6. Admin "End session" can never work. `AdminDashboard.jsx:395` calls `POST /sessions/:code/end`, but the backend allows only the teacher who owns the session (`routes/sessions.js:85`, `auth(['teacher'])`). Repro: as admin, open Active Sessions and end a live session; you get "Failed".
7. Student chat never reaches the teacher. `StudentView.jsx:182` emits `student:chat` and `TeacherDashboard.jsx:75` listens for it, but the backend's `config/socket.js` has no `student:chat` handler. The Messages page can only ever be empty. This needs a backend change.
8. The teacher's "reply" ignores what they type. `TeacherDashboard.jsx:357-361` sends the fixed nudge text and drops `replyText`.

### Fake data shown as real
9. Landing page (`LandingPage.jsx`): a signed-in "A. Evans (Teacher)" badge (line 256), made-up sessions (276), random "847 students online" and "74% attention" (231-232, 302-307), a random alert feed, heatmap and expression bars, "24 API endpoints" (372; the backend has 26 routes plus a health check), and "No data sent to servers" (379), which is false because attention scores are sent.
10. Admin overview: "Average attention" is a random number between 70 and 87 every 2.5 s (`AdminDashboard.jsx:164`); "Alerts today" is random on every render (206).
11. Admin session detail: the chart, the three students (Neel, Priya, Rahul) and "Live insights" dated 16/03/2025 are all hardcoded (368-382, 488).
12. Student session: the attention streak never shows less than 12 minutes (`StudentView.jsx:339`, `Math.max(attnStreak, 12)`); the "Critical attention alert" list is five hardcoded lines (44-50); both heatmaps are random; the attention bar shows 75% before any data (447); "Class Avg Attention" shows "Good" with no data (291, 432) and is really the student's own score; "Goal Plans" and "Class Focus" both just show today's date (282-288); the student card says "Teacher profile" (367).
13. Teacher start screen: four "Invited students" avatars (N, P, R, A) are hardcoded (`TeacherDashboard.jsx:301`).
14. Landing step text says "Start ElectIQ" (`LandingPage.jsx:210`), the wrong product name.

### Broken or dead controls
15. Admin settings sliders jump and lose the drag. `SliderRow` is declared inside `AdminSettings` (`AdminDashboard.jsx:588`), so every change remounts every slider.
16. Dead buttons: "Pause and Ask" and "Suggest Focus Nudge" in `StudentView.jsx:475,512`; the "Load Preset" select in `TeacherDashboard.jsx:601`; the "···" menus on the landing page and the admin table.
17. `useStreak` (`StudentView.jsx:19-31`) uses `attention >= 60` as an effect dependency and clears the timer in cleanup on every flip. Its result was also hidden by bug 12.
18. Institution feature choices are ignored: Register saves `enabledFeatures`, but the student view always loads all five detectors (`StudentView.jsx:186`).
19. Maximising a detector opens a second copy of it, which asks for the camera again (`StudentView.jsx:497`).
20. Admin "Reset password" uses `window.prompt` with no confirmation and no error when the password is too short (`AdminDashboard.jsx:274`).

### Security
21. The parent window trusts any `message` event with `type: 'ciq-detection'` from any origin (`StudentView.jsx:121`) and posts to the iframes with `'*'` (86, 403). Another page that frames the app could feed it fake attention scores.
22. New users get a public default password (`Teacher@123` / `Student@123`, `AdminDashboard.jsx:256,307`), and the form prints it on screen.
23. Leaked keys: none. I scanned the single commit (`cea0006`) for OpenAI, Google, GitHub, AWS, Hugging Face and Slack tokens, private keys and Mongo URIs. Only public CDN URLs turned up. `.env` was never committed.
24. `.gitignore` is incomplete. It misses `.env.*` (`.env.local`, `.env.production`), `coverage/`, `.vite/`, editor folders and `npm-debug.log*`. The file also has no trailing newline.

### Layout and accessibility
25. Nothing is responsive. The landing page is a fixed 190/290/190 px grid, the dashboards have a fixed 220 px sidebar, and the student session is a fixed 220/1fr/220 grid. At 390 px the landing sign-in form is cut off and the admin sidebar takes 56% of the screen. Screenshots: `shots/before/*-mobile.png`.
26. axe: low-contrast text everywhere (e.g. `#334155` on `#070c14`), no `<main>` or `h1` on the public pages, icon-only buttons with no name (password eye, maximise, chat send, reset password), sliders and number inputs with no label, logos with no `alt` in the teacher and student views.
27. Fonts load through `@import` inside inline `<style>` tags on every page, which blocks rendering, and `index.html` sets a different dark background that flashes first.

### Found while building v2
28. A page refresh during a live session loses it. The teacher dashboard kept the session only in memory, so after a reload the teacher couldn't see or end it. v2 restores it from `/sessions/my-sessions`.
29. The productive struggle detector never ran. `public/dashboard_struggle.html` was missing the closing `}` of `mainTick()` (around line 1225), so the whole script failed with "Unexpected end of input".
30. The student view sent `student:face-lost` and `student:face-found` from inside a React state updater (`StudentView.jsx:132-133`). React can call updaters twice, so the events could go out twice.
31. The landing page said expressions come from face-api.js (`LandingPage.jsx:418`). The detector (`public/dashboard5.html`) uses its own landmark rules and doesn't load face-api.js.

## v2 plan

Branch `v2`. `main` stays untouched until Cyber approves.

1. Tooling: add `.eslintrc.cjs`, remove unused `recharts` and `date-fns`, drop the empty chunk, self-host fonts through `@fontsource`, and complete `.gitignore`.
2. Data fixes: 401s on auth endpoints no longer redirect; the reply sends what the teacher typed; the streak is real; feature flags pick which detectors load; postMessage checks the origin; the maximised view reuses the same iframe. Every fake number, name and list comes out. Where there is no real source, the panel goes or shows an honest empty state.
3. Admin "End session" is removed (backend rejects it) and replaced with a note that the teacher ends sessions. Admin session detail shows the real summary fields only. Chat stays in the UI with a note that it needs the backend's `student:chat` relay. The default-password field is required instead.
4. Design: one shared stylesheet with tokens instead of inline style objects. Warm paper `#F5F1E8`, ink `#1F1C17`, one accent (chalkboard green `#2F5D50`, chosen for a classroom product instead of the usual terracotta), Newsreader for headings and Instrument Sans for body, soft tinted shadows, pill main buttons, a 1.25 type scale and 24 px card gaps. Dashboards use a top bar with tabs, which wraps to a scrollable row on mobile. No gradients, glass, glows or emoji.
5. Motion: one slow continuous element on the landing page (a breathing attention line in the example card, labelled as an example) and short transitions on actions. All motion stops under `prefers-reduced-motion`.
6. Verify: build with no warnings, lint clean, no console errors, Playwright screenshots at 1440 and 390 under `shots/after/`, and before/after axe counts.

## Not in scope
- Backend changes (chat relay, admin end-session, CORS for a hosted frontend). They are listed above so the backend repo can pick them up.
- Rewriting the five detector pages in `public/`. They work as embedded tools and use their own styles.
- Deploy.

## v2 results (Oct 14, 2026)

- `npm run build`: no warnings. `npm run lint`: clean, 0 warnings.
- axe on 13 routes at 1440 px: 34 rule failures and 327 nodes before, 0 after.
- Console errors on the 13 routes at 1440 and 390 px: none before or after. The only error in the end-to-end run is the expected 401 from the wrong-password check.
- Horizontal overflow at 390 px: none.
- End-to-end run against the local backend passed. It covered: a wrong password shows an inline error and stays on the page; the teacher starts a session; the student joins and appears on the teacher's grid; a nudge and a typed message both reach the student; expanding a detector keeps 5 iframes, not 6; a teacher reload restores the live session; ending the session sends the student back to the join screen; the report opens.
- Screenshots: `shots/before/` and `shots/after/`. The `flow-*` files come from the end-to-end run.

Not verified:
- A real webcam and real faces. Tests used Chromium's fake camera, so every attention score was 0 and "face out of view".
- Safari, Firefox and real phones.
- Running the five MediaPipe detectors together is heavy without a GPU. In the multi-tab test, the student tab crashed once out of three runs and logged MediaPipe asset errors. A student tab on its own logged none.
- Any hosted backend. The Azure URL did not answer.
