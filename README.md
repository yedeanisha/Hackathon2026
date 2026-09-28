# Panelist — AI-assisted HR Interview Management (frontend)

AI-assisted interview management for the hackathon: Project Owners create interview projects,
upload resumes, assign panels; interviewers submit structured feedback; one Final Decision Maker
(FDM) consolidates it; the owner approves. Built for Google Cloud (Firebase Hosting + Cloud Run + Gemini on Vertex AI).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/ for Firebase Hosting
```

Requires Node 20+. Stack: React 19, Vite, Tailwind CSS v4, react-icons (Lucide set). No router
dependency: a tiny hash router lives in `src/router.jsx` (works on Firebase Hosting with no rewrites).

## Sign-in and roles

Everyone signs in with an email and password, and the account decides the role:
**Project Owner, Interviewer, Candidate or HR Admin**.

Demo accounts (password for all: `Demo@2026`):

| Role | Name | Email |
|---|---|---|
| Project Owner | Ananya Rao | ananya.rao@teksystems.demo |
| HR Admin | Meera Kapoor | meera.kapoor@teksystems.demo |
| HR Admin | James Whitfield | james.whitfield@teksystems.demo |
| Interviewer | Rahul Mehta | rahul.mehta@teksystems.demo |
| Interviewer | Sarah Thomas | sarah.thomas@teksystems.demo |
| Interviewer | Priya Nair | priya.nair@teksystems.demo |
| Interviewer | Arjun Singh | arjun.singh@teksystems.demo |
| Interviewer | Emily Clarke | emily.clarke@teksystems.demo |
| Interviewer | Oliver Bennett | oliver.bennett@teksystems.demo |
| Interviewer | Sneha Kulkarni | sneha.kulkarni@teksystems.demo |
| Candidate | Neha Sharma | neha.sharma@teksystems.demo |
| Candidate | Vikram Patel | vikram.patel@teksystems.demo |
| Candidate | Charlotte Hughes | charlotte.hughes@teksystems.demo |
| Candidate | Thomas Wright | thomas.wright@teksystems.demo |

- **Candidates** create their own account from the sign-in page (Create account).
- **Interviewers** are created by a Project Owner or HR Admin on the Interviewers page.
- Anyone can change their password from the menu under their name.

The app works in two modes, with the same screens:

| Mode | When | Where logins are stored |
|---|---|---|
| Built-in accounts | No Firebase keys set (default) | In the app's data, passwords saved only as salted SHA-256 hashes (`src/auth/password.js`) |
| Firebase Authentication | `VITE_FIREBASE_*` keys set in `.env.local` | Firebase Authentication; roles in Firestore `users/{uid}`, protected by `firestore.rules` |

Built-in accounts are for the demo: data (including accounts) lives in each browser's local storage,
so accounts created on one machine don't exist on another. Use Firebase for anything shared.

### Connect Firebase Authentication

1. In the [Firebase console](https://console.firebase.google.com), add Firebase to your Google Cloud project.
2. **Authentication → Sign-in method**: enable **Email/Password** and **Google**.
3. **Firestore Database → Create database** (production mode).
4. **Project settings → Your apps → Add app → Web**. Copy the config values into a new file
   `.env.local` (use `.env.example` as the template).
5. Deploy the security rules:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use your-project-id
   firebase deploy --only firestore:rules
   ```
6. Create all the demo accounts in one go:
   - Firebase console → **Project settings → Service accounts → Generate new private key**.
   - Save the downloaded file in the project folder as `service-account.json`
     (it is in `.gitignore`; never share or commit it).
   - Run `npm run create-demo-users`.
7. Restart `npm run dev`. The sign-in page now says "Secured by Firebase Authentication" and shows
   **Continue with Google**.
8. When you deploy to Firebase Hosting, the hosting domain is authorised automatically. For any other
   domain, add it under **Authentication → Settings → Authorized domains**.

How roles work with Firebase:
- Self sign-up (email or Google) always creates a **Candidate**.
- When an owner or HR admin registers an interviewer, the app saves an **invite** for that email.
  When the person signs up with that email, they get the Interviewer role.
- The rules stop anyone from giving themselves a staff role. Only an HR admin can change roles.
- Every AI request sends the user's Firebase ID token (`Authorization: Bearer …`). The Cloud Run backend
  should verify it with `firebase-admin` (`auth.verify_id_token(token)`) and read the role from `users/{uid}`.

## Suggested 3-minute demo

1. Sign in as the Project Owner → New project → type "Frontend Engineer" → **Generate** (AI drafts JD, skills, stages, criteria).
2. Backend Engineer → **Add candidate** → drop any PDF → AI extracts details + fit score.
3. **Assign interview** → **Use AI suggestion** (panel and panel lead picked automatically).
4. Sign out → sign in as the Candidate → **Prepare with AI** → **Confirm slot**; the owner is notified.
5. Sign in as the Interviewer → overdue interview → **Generate** questions → paste rough notes → **Structure with AI**
   (try "he seems young" to show the bias flag) → Submit → **Summarise panel feedback** → send to owner.
6. Sign in as the Project Owner → bell notification → Approvals → Approve. The candidate sees the outcome.
7. Sign in as the HR Admin → Audit log shows every step.

Before presenting, sign in as the Owner or HR Admin and use **Reset demo data** in the menu under your name.

## Project structure

```
src/
  main.jsx                 entry point
  App.jsx                  sign-in gate + which role can open which page
  router.jsx               minimal hash router
  utils.js                 small helpers (dates, ids)
  auth/                    sign-in: Firebase or built-in accounts, password hashing
  store/store.jsx          app data, workflow rules, notifications, audit log
  services/ai.js           every AI feature (simulated now; one function per backend endpoint)
  services/transcript.js   reads Teams / Zoom / Meet transcripts (.docx, .vtt, .txt)
  data/seed.js             demo data
  components/              shared UI, layout and dialogs
  components/interview/    parts of the interview page: feedback form, transcript panel,
                           final decision form, suggested questions
  pages/                   one file per screen
scripts/create-demo-users.mjs   creates the demo logins in Firebase
samples/                        example Teams transcripts (.docx and .vtt) for trying the transcript feature
```

## Interview transcripts

On an interview page, the interviewer can upload the meeting transcript (Teams "Download
transcript" as .docx or .vtt, Zoom or Google Meet .vtt/.txt) or paste it. AI picks out the
candidate, suggests a 1–5 rating for each evaluation criterion with quotes as evidence, lists
concerns and a recommendation. **Use in feedback form** copies the draft into the form; the
interviewer edits it before submitting. Try it with the files in `samples/` (sign in as
Sarah Thomas and open Vikram Patel's interview).

## Connecting the real backend

**AI** — in `src/services/ai.js` set `USE_MOCK_AI = false` and implement these on Cloud Run
(each calls Gemini on Vertex AI with a JSON response schema matching what the mock returns):

| Endpoint | Used for |
|---|---|
| `POST /api/ai/project-draft` | JD, skills, stages, criteria from role + designation |
| `POST /api/ai/parse-resume` (multipart PDF) | Extract profile + fit score (store PDF in Cloud Storage) |
| `POST /api/ai/suggest-panel` | Rank interviewers, pick FDM |
| `POST /api/ai/questions` | Tailored interview questions |
| `POST /api/ai/polish-feedback` | Structure rough notes, flag biased wording |
| `POST /api/ai/consolidate` | Panel summary + recommendation for the final decision |
| `POST /api/ai/prep-guide` | Candidate-facing prep tips (never the real questions) |
| `POST /api/ai/analyse-transcript` | Ratings with evidence, concerns and recommendation from a meeting transcript |

**Data** — every action in `src/store/store.jsx` has a comment with its REST endpoint
(`POST /api/projects`, `POST /api/assignments/:id/feedback`, …). Replace the body of each action
with a `fetch` to the Cloud Run API and read data from Firestore (real-time listeners make the
notification bell live). `vite.config.js` proxies `/api` to `localhost:8080` for local development.

**Auth** — see *Connect Firebase Authentication* above. The backend must enforce the same access
rules the UI shows: resumes and feedback only for the assigned panel and the project owner;
other panelists' feedback visible only to the panel lead (after submitting their own) and the owner; candidates see only their own status and schedule.

## Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting      # public dir: dist, single-page app: No
npm run build
firebase deploy
```
