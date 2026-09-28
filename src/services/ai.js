// All AI features in one place. Each function below matches one endpoint on the
// Cloud Run backend, which calls Gemini on Vertex AI and returns JSON:
//
//   1. project-draft        draft a project from role + designation
//   2. parse-resume         extract candidate details and score fit
//   3. suggest-panel        rank interviewers for an interview
//   4. questions            tailored interview questions
//   5. polish-feedback      turn rough notes into structured feedback
//   6. consolidate          summarise the panel for the Final Decision Maker
//   7. prep-guide           prep tips for candidates
//   8. analyse-transcript   rate an interview from its meeting transcript
//
// While USE_MOCK_AI is true, results are simulated in the browser so the demo works
// without a backend. To go live: set it to false and build these endpoints.

import { sleep } from '../utils';
import { getAuthToken } from '../auth/AuthProvider';

// Every request carries the signed-in user's Firebase ID token (when Firebase is on),
// so the Cloud Run backend can verify who is calling and check their role.
async function authHeaders(extra = {}) {
  const token = await getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export const USE_MOCK_AI = true;

async function callApi(path, body) {
  const res = await fetch(`/api/ai/${path}`, {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  return res.json();
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9+#.]/g, '');
const hasSkill = (list, skill) => list.some((s) => norm(s) === norm(skill));
const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

// ---------------------------------------------------------------------------
// 1. Project setup assistant   →  POST /api/ai/project-draft
// ---------------------------------------------------------------------------
const SKILL_LIBRARY = [
  { match: /data|etl|analytics eng/i, skills: ['Python', 'SQL', 'Spark', 'BigQuery', 'Airflow', 'GCP'], focus: 'data pipelines and analytics platforms' },
  { match: /front|ui|react|web/i, skills: ['React', 'TypeScript', 'CSS', 'Accessibility', 'Testing', 'REST APIs'], focus: 'fast, accessible web experiences' },
  { match: /devops|sre|platform|cloud|infra/i, skills: ['Kubernetes', 'Terraform', 'CI/CD', 'GCP', 'Monitoring', 'Linux'], focus: 'reliable cloud infrastructure' },
  { match: /ml|machine learning|ai /i, skills: ['Python', 'PyTorch', 'MLOps', 'Vertex AI', 'Statistics', 'SQL'], focus: 'production machine learning systems' },
  { match: /product manager|product owner|\bpm\b/i, skills: ['Product Strategy', 'Roadmapping', 'Stakeholder Management', 'Analytics', 'User Research'], focus: 'product outcomes and roadmap delivery' },
  { match: /hr|recruit|talent|people/i, skills: ['Talent Acquisition', 'Employee Relations', 'HR Policy', 'Communication', 'HRIS'], focus: 'people programmes and hiring' },
  { match: /qa|test/i, skills: ['Test Automation', 'Selenium', 'API Testing', 'CI/CD', 'Java'], focus: 'product quality and test automation' },
  { match: /mobile|android|ios/i, skills: ['Kotlin', 'Swift', 'Mobile Architecture', 'REST APIs', 'Testing'], focus: 'high-quality mobile apps' },
  { match: /backend|java|api|server/i, skills: ['Java', 'Spring Boot', 'Microservices', 'REST APIs', 'SQL', 'GCP'], focus: 'scalable backend services' },
  { match: /full.?stack/i, skills: ['React', 'Node.js', 'TypeScript', 'REST APIs', 'SQL', 'GCP'], focus: 'end-to-end product features' },
];

export async function generateProjectDraft({ role, designation, department }) {
  if (!USE_MOCK_AI) return callApi('project-draft', { role, designation, department });
  await sleep(1200);
  const text = `${role} ${designation}`;
  const lib = SKILL_LIBRARY.find((l) => l.match.test(text)) ?? {
    skills: ['Communication', 'Problem Solving', 'Domain Knowledge', 'Collaboration', 'Stakeholder Management'],
    focus: 'high-impact work across the team',
  };
  const senior = /senior|lead|principal|staff|manager|head|director|l[3-9]/i.test(text);
  const dept = department || 'our';
  return {
    description:
      `We are looking for a ${designation || role} to join the ${dept} team as a ${role}. ` +
      `You will focus on ${lib.focus}, working with cross-functional partners to deliver measurable outcomes. ` +
      (senior
        ? 'This is a senior role: you will set technical direction, mentor others and own outcomes end to end.'
        : 'You will grow quickly with strong mentorship and ownership of well-scoped features.'),
    responsibilities: [
      `Deliver and own work in ${lib.focus}`,
      'Collaborate with product, design and engineering partners',
      senior ? 'Mentor team members and review their work' : 'Learn from and contribute to team reviews',
      'Communicate progress, risks and trade-offs clearly',
    ].join('\n'),
    requiredSkills: lib.skills,
    stages: [
      { name: /hr|recruit|product/i.test(text) ? 'Functional round' : 'Technical round', type: 'technical' },
      { name: 'Behavioural round', type: 'behavioural' },
      ...(senior ? [{ name: 'Managerial round', type: 'managerial' }] : []),
      { name: 'HR discussion', type: 'hr' },
    ],
    criteria: [
      { name: /hr|recruit|product/i.test(text) ? 'Functional expertise' : 'Technical depth', weight: 30 },
      { name: 'Problem solving', weight: 25 },
      { name: 'Communication', weight: 15 },
      { name: senior ? 'Leadership' : 'Collaboration', weight: 15 },
      { name: 'Culture & values', weight: 15 },
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Resume parsing + fit score   →  POST /api/ai/parse-resume  (multipart: PDF)
//    Backend: upload PDF to Cloud Storage, send to Gemini with the project's
//    required skills, return the structured profile below.
// ---------------------------------------------------------------------------
const SAMPLE_PROFILES = [
  { currentRole: 'Software Engineer at NovaBank', experience: 5, education: 'B.Tech Computer Science', location: 'London, UK', skills: ['Java', 'Spring Boot', 'SQL', 'Kafka', 'Docker', 'REST APIs'], highlights: ['Built a real-time fraud-scoring API processing 5k req/s', 'Mentored 2 graduate engineers', 'Reduced deployment time by 60% with CI/CD'] },
  { currentRole: 'Data Engineer at StreamMart', experience: 4, education: 'M.Sc Data Engineering', location: 'Bristol, UK', skills: ['Python', 'SQL', 'BigQuery', 'Airflow', 'dbt', 'GCP'], highlights: ['Built streaming pipelines with Pub/Sub and Dataflow', 'Owned data-quality framework for 80 tables', 'Cut BigQuery costs by 35%'] },
  { currentRole: 'Frontend Engineer at Tripwise', experience: 3, education: 'B.Sc Computer Science', location: 'Remote', skills: ['React', 'TypeScript', 'CSS', 'Testing', 'REST APIs'], highlights: ['Rebuilt booking flow, improving conversion by 12%', 'Introduced accessibility audits', 'Led migration to TypeScript'] },
  { currentRole: 'Senior Developer at Logico', experience: 8, education: 'B.E. Information Technology', location: 'Edinburgh, UK', skills: ['Java', 'Microservices', 'GCP', 'Kubernetes', 'SQL', 'System Design'], highlights: ['Architected a microservices platform on GKE', 'Led a team of 6 engineers', 'Designed multi-region failover'] },
  { currentRole: 'Platform Engineer at Cloudly', experience: 6, education: 'B.Sc Computer Engineering', location: 'Cambridge, UK', skills: ['Kubernetes', 'Terraform', 'GCP', 'CI/CD', 'Python', 'Monitoring'], highlights: ['Managed 40+ GKE clusters with Terraform', 'Built self-service deployment platform', 'Improved uptime to 99.95%'] },
];
const FIRST = ['Aisha', 'Rohan', 'Emily', 'Karthik', 'Sofia', 'James', 'Lakshmi', 'Omar', 'Chloe', 'Nikhil'];
const LAST = ['Verma', 'Clarke', 'Iyer', 'Hughes', 'Menon', 'Ahmed', 'Reddy', 'Wilson', 'Gupta', 'Evans'];

function nameFromFile(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/(resume|cv|profile|final|updated|\d+)/gi, ' ');
  const words = base.split(/[\s_\-.]+/).filter((w) => /^[a-z]{2,}$/i.test(w));
  if (words.length >= 2) return words.slice(0, 2).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const h = hash(fileName);
  return `${FIRST[h % FIRST.length]} ${LAST[(h >> 3) % LAST.length]}`;
}

export function scoreFit(skills, requiredSkills, experience = 0) {
  const matched = requiredSkills.filter((r) => hasSkill(skills, r));
  const gaps = requiredSkills.filter((r) => !hasSkill(skills, r));
  const ratio = requiredSkills.length ? matched.length / requiredSkills.length : 0;
  const expScore = Math.min(experience, 8) / 8;
  const fitScore = Math.round(35 + ratio * 50 + expScore * 12);
  const fitReason =
    `Matches ${matched.length} of ${requiredSkills.length} required skills` +
    (matched.length ? ` (${matched.join(', ')})` : '') +
    `. ${experience} years of relevant experience.` +
    (gaps.length ? ` Probe: ${gaps.join(', ')}.` : ' Full skill coverage.');
  return { fitScore: Math.min(fitScore, 98), fitReason, gaps };
}

export async function parseResume(file, project) {
  if (!USE_MOCK_AI) {
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', project.id);
    const res = await fetch('/api/ai/parse-resume', { method: 'POST', body: form, headers: await authHeaders() });
    if (!res.ok) throw new Error('Resume parsing failed');
    return res.json();
  }
  await sleep(1600);
  const h = hash(file.name + project.id);
  // Bias the sample towards the project's skill area so the demo looks realistic.
  const ranked = [...SAMPLE_PROFILES].sort(
    (a, b) => project.requiredSkills.filter((s) => hasSkill(b.skills, s)).length - project.requiredSkills.filter((s) => hasSkill(a.skills, s)).length
  );
  const profile = ranked[h % 2];
  const name = nameFromFile(file.name);
  const slug = name.toLowerCase().replace(/\s+/g, '.');
  const fit = scoreFit(profile.skills, project.requiredSkills, profile.experience);
  return {
    name,
    email: `${slug}@mail.com`,
    phone: `+44 7700 9${String(h % 100000).padStart(5, '0')}`,
    location: profile.location,
    currentRole: profile.currentRole,
    experience: profile.experience,
    education: profile.education,
    skills: profile.skills,
    summary: `${profile.currentRole.split(' at ')[0]} with ${profile.experience} years of experience. Key strengths: ${profile.skills.slice(0, 3).join(', ')}.`,
    highlights: profile.highlights,
    ...fit,
  };
}

// ---------------------------------------------------------------------------
// 3. Interview panel suggestion   →  POST /api/ai/suggest-panel
//    Simple, explainable scoring (no embeddings needed for the hackathon).
// ---------------------------------------------------------------------------
export async function suggestPanel(project, type, interviewers) {
  if (!USE_MOCK_AI) return callApi('suggest-panel', { projectId: project.id, type });
  await sleep(700);
  const scored = interviewers.map((iv) => {
    const overlap = project.requiredSkills.filter((s) => hasSkill(iv.expertise || [], s));
    let score = overlap.length / Math.max(project.requiredSkills.length, 1);
    const reasons = [];
    if (overlap.length) reasons.push(`Expertise in ${overlap.slice(0, 3).join(', ')}`);
    const t = `${iv.designation} ${iv.department}`;
    if (type === 'hr' && /hr|human/i.test(t)) { score += 0.8; reasons.push('HR specialist'); }
    if (type === 'behavioural' && /hr|human|director|manager/i.test(t)) { score += 0.5; reasons.push('Experienced in behavioural assessment'); }
    if (type === 'managerial' && /director|manager|head|lead/i.test(t)) { score += 0.8; reasons.push('Senior leadership'); }
    if (type === 'technical' && /hr|human/i.test(t)) score -= 0.5;
    if (iv.department && iv.department === project.department) { score += 0.15; reasons.push(`${project.department} department`); }
    score += Math.min(iv.experience || 0, 15) / 60;
    return { id: iv.id, match: Math.max(5, Math.min(99, Math.round(score * 70 + 20))), reason: reasons.join(' · ') || 'General interviewing experience' };
  });
  scored.sort((a, b) => b.match - a.match);
  const recommended = scored.slice(0, type === 'technical' ? 2 : 1).map((s) => s.id);
  const fdmId = [...recommended].sort(
    (a, b) => (interviewers.find((i) => i.id === b)?.experience || 0) - (interviewers.find((i) => i.id === a)?.experience || 0)
  )[0];
  return { ranking: scored, recommended, fdmId };
}

// ---------------------------------------------------------------------------
// 4. Tailored interview questions   →  POST /api/ai/questions
// ---------------------------------------------------------------------------
const QUESTION_BANK = {
  technical: [
    'Walk me through the architecture of the most complex system you have built. What would you change today?',
    'How do you decide between consistency and availability when designing a service?',
    'Describe how you would debug a production issue where latency doubled overnight.',
    'How do you approach testing for code you are about to ship to production?',
  ],
  behavioural: [
    'Tell me about a time you disagreed with a teammate. How did you resolve it?',
    'Describe a project that failed. What did you learn and change afterwards?',
    'Give an example of when you went beyond your role to help the team succeed.',
    'Tell me about a time you had to deliver under a tight deadline.',
  ],
  managerial: [
    'How do you prioritise when the roadmap and incident load compete for the same people?',
    'Describe how you have grown someone on your team.',
    'How do you communicate a delay to senior stakeholders?',
    'Tell me about a difficult trade-off decision you made and how you made it.',
  ],
  hr: [
    'What motivates you to consider this role right now?',
    'What kind of team culture helps you do your best work?',
    'Where do you see your career in the next two to three years?',
    'What is your notice period and are there any constraints on start date?',
  ],
};

export async function generateQuestions(project, candidate, type) {
  if (!USE_MOCK_AI) return callApi('questions', { projectId: project.id, candidateId: candidate.id, type });
  await sleep(1100);
  const out = QUESTION_BANK[type].slice(0, 3).map((q) => ({ q, focus: 'Core' }));
  if (type === 'technical') {
    (candidate.gaps || []).slice(0, 2).forEach((gap) =>
      out.push({ q: `Your resume doesn't show much ${gap}. How would you get productive with it in your first month here?`, focus: `Gap: ${gap}` })
    );
    if (candidate.highlights?.[0]) out.push({ q: `You mention "${candidate.highlights[0]}". What was your specific contribution, and how did you measure the impact?`, focus: 'Resume deep-dive' });
  } else {
    out.push({ q: `This ${project.role} role involves: ${project.responsibilities.split('\n')[0].toLowerCase()}. Tell me about a time you did something similar.`, focus: 'Role fit' });
    if (candidate.highlights?.[0]) out.push({ q: `How did you work with others to achieve "${candidate.highlights[0]}"?`, focus: 'Resume deep-dive' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 5. Feedback assistant   →  POST /api/ai/polish-feedback
//    Turns rough notes into structured feedback and flags biased wording.
// ---------------------------------------------------------------------------
const POSITIVE = /(good|great|strong|excellent|solid|clear|impressive|well|confident|quick|thorough|deep|structured)/i;
const NEGATIVE = /(weak|lack|lacks|struggl|missing|concern|poor|limited|slow|unclear|not |didn't|couldn't|shallow|gap|rushed)/i;
const BIAS_TERMS = [
  { re: /\b(young|old|older|age|aged)\b/i, why: 'age' },
  { re: /\b(married|single|kids|children|pregnan\w*|family plans)\b/i, why: 'family status' },
  { re: /\b(accent|foreign|native)\b/i, why: 'national origin / accent' },
  { re: /\b(he|she) (is|seems) (too )?(emotional|aggressive|bossy)\b/i, why: 'gendered language' },
  { re: /\b(religio\w*|church|mosque|temple)\b/i, why: 'religion' },
  { re: /\b(looks|attractive|appearance)\b/i, why: 'appearance' },
];

export async function polishFeedback(notes, criteria) {
  if (!USE_MOCK_AI) return callApi('polish-feedback', { notes, criteria });
  await sleep(1000);
  const all = notes.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  // Sentences with potentially biased wording are flagged and kept out of the structured feedback.
  const sentences = all.filter((s) => !BIAS_TERMS.some((b) => b.re.test(s)));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const strengths = sentences.filter((s) => POSITIVE.test(s) && !NEGATIVE.test(s)).map(cap);
  const concerns = sentences.filter((s) => NEGATIVE.test(s)).map(cap);
  const biasFlags = BIAS_TERMS.filter((b) => b.re.test(notes)).map((b) => b.why);
  const posRatio = (strengths.length + 1) / (strengths.length + concerns.length + 2);
  const base = Math.round(2 + posRatio * 3);
  const ratings = Object.fromEntries(criteria.map((c, i) => [c.name, Math.max(1, Math.min(5, base + (i % 2 === 0 ? 0 : concerns.length > strengths.length ? -1 : 0)))]));
  const decision = posRatio > 0.62 ? 'Proceed' : posRatio < 0.38 ? 'Reject' : 'Hold';
  return {
    strengths: strengths.join(' ') || 'No clear strengths noted — consider adding specific examples.',
    concerns: concerns.join(' ') || 'No significant concerns noted.',
    details: sentences.map(cap).join(' '),
    ratings,
    decision,
    biasFlags,
  };
}

// ---------------------------------------------------------------------------
// 6. FDM consolidation   →  POST /api/ai/consolidate
// ---------------------------------------------------------------------------
export async function consolidateFeedback(feedbackList, criteria, nameOf) {
  if (!USE_MOCK_AI) return callApi('consolidate', { feedback: feedbackList, criteria });
  await sleep(1500);
  const avg = Object.fromEntries(
    criteria.map((c) => {
      const vals = feedbackList.map((f) => f.ratings?.[c.name]).filter(Boolean);
      return [c.name, vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null];
    })
  );
  const weighted = criteria.reduce((sum, c) => sum + (avg[c.name] || 0) * c.weight, 0) / criteria.reduce((s, c) => s + c.weight, 0);
  const tally = feedbackList.reduce((t, f) => ({ ...t, [f.decision]: (t[f.decision] || 0) + 1 }), {});
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const unanimous = top.length === 1;
  let recommendation = top[0][0];
  if (!unanimous && top[0][1] === top[1][1]) recommendation = weighted >= 3.8 ? 'Proceed' : 'Hold';

  const strongest = criteria.filter((c) => avg[c.name] >= 4).map((c) => c.name);
  const weakest = criteria.filter((c) => avg[c.name] != null && avg[c.name] < 3.5).map((c) => c.name);
  const disagreements = [];
  criteria.forEach((c) => {
    const vals = feedbackList.map((f) => f.ratings?.[c.name]).filter(Boolean);
    if (vals.length > 1 && Math.max(...vals) - Math.min(...vals) >= 2) disagreements.push(`${c.name}: ratings range from ${Math.min(...vals)} to ${Math.max(...vals)}`);
  });
  if (!unanimous) disagreements.push(`Decisions differ: ${feedbackList.map((f) => `${nameOf(f.interviewerId)} → ${f.decision}`).join(', ')}`);

  const summary =
    `${feedbackList.length} interviewer${feedbackList.length > 1 ? 's' : ''} assessed the candidate with a weighted score of ${weighted.toFixed(1)}/5. ` +
    (strongest.length ? `Consistently strong in ${strongest.join(', ')}. ` : '') +
    (weakest.length ? `Weaker areas: ${weakest.join(', ')}. ` : '') +
    (unanimous ? `The panel unanimously recommends "${recommendation}".` : `The panel is split; the consolidated view leans towards "${recommendation}".`);

  return {
    recommendation,
    weightedScore: +weighted.toFixed(1),
    averages: avg,
    summary,
    keyStrengths: feedbackList.map((f) => f.strengths).filter(Boolean),
    keyConcerns: feedbackList.map((f) => f.concerns).filter(Boolean),
    disagreements,
    rationale:
      recommendation === 'Proceed'
        ? `Strong overall performance (${weighted.toFixed(1)}/5). Address noted concerns in the next stage.`
        : recommendation === 'Hold'
          ? 'Mixed signals from the panel; consider an additional round or compare with other candidates before deciding.'
          : recommendation === 'Reject'
            ? 'Performance below the bar on key criteria for this role.'
            : 'Candidate is a better match for a different open role.',
  };
}

// ---------------------------------------------------------------------------
// 7. Candidate prep tips   →  POST /api/ai/prep-guide
//    Candidate-facing: general preparation advice for the role and interview type.
//    It never reveals the interviewers' actual questions or evaluation notes.
// ---------------------------------------------------------------------------
const PREP = {
  technical: [
    'Review the core skills listed for the role and be ready to explain how you have used them in real projects.',
    'Practise talking through a design problem out loud: clarify requirements first, then trade-offs.',
    'Prepare one project you can go deep on: architecture, your specific contribution and measurable results.',
  ],
  behavioural: [
    'Prepare 3–4 stories using the STAR method (situation, task, action, result).',
    'Include one story about a disagreement and one about a setback, and what you learned.',
    'Keep answers to about two minutes and focus on what you personally did.',
  ],
  managerial: [
    'Be ready to discuss how you prioritise competing work and communicate trade-offs.',
    'Think of an example of helping someone on your team grow.',
    'Prepare questions about how the team sets goals and measures success.',
  ],
  hr: [
    'Be clear on why this role interests you and what you are looking for next.',
    'Know your notice period and any constraints on start date.',
    'Prepare questions about team culture, ways of working and growth opportunities.',
  ],
};

export async function generatePrepGuide(project, type) {
  if (!USE_MOCK_AI) return callApi('prep-guide', { projectId: project.id, type });
  await sleep(900);
  return {
    focus: project.requiredSkills.slice(0, 4),
    tips: PREP[type] || PREP.behavioural,
    logistics: 'Join 5 minutes early, test your camera and microphone, and keep a copy of your resume to hand.',
  };
}

// ---------------------------------------------------------------------------
// 8. Interview transcript analysis   →  POST /api/ai/analyse-transcript
//    Input: the transcript as speaker turns (see services/transcript.js).
//    Output: summary, a suggested 1–5 rating per evaluation criterion with
//    quotes as evidence, strengths, concerns and a recommendation.
//    Everything is a draft: the interviewer edits it before submitting.
// ---------------------------------------------------------------------------

// Words that show evidence for each kind of criterion (matched on the criterion's name).
const CRITERION_SIGNALS = [
  { match: /technical|functional|expertise|depth/i, words: ['api', 'database', 'index', 'cache', 'service', 'microservice', 'architecture', 'deploy', 'query', 'pipeline', 'kafka', 'design'] },
  { match: /problem/i, words: ['first', 'then', 'trade-off', 'approach', 'debug', 'compare', 'option', 'root cause', 'because', 'instead'] },
  { match: /communication/i, words: ['first', 'then', 'because', 'for example', 'so that', 'which means'] },
  { match: /collaborat|team/i, words: ['team', 'together', 'review', 'pair', 'stakeholder', 'product manager', 'agreed'] },
  { match: /culture|values/i, words: ['learn', 'feedback', 'improve', 'happy to', 'ownership', 'mentor'] },
  { match: /leader/i, words: ['led', 'lead', 'mentor', 'coach', 'decision', 'ownership'] },
  { match: /model/i, words: ['schema', 'model', 'star', 'partition', 'index', 'table', 'normalis'] },
  { match: /ownership/i, words: ['owned', 'own ', 'on-call', 'responsible', 'end to end'] },
];

// Phrases that show uncertainty or a gap in experience.
const HESITATION = /\b(not sure|don't know|do not know|no idea|haven't used|not much|no experience|never used|not hands-on|haven't worked)\b/i;

// How interviewers phrase questions that don't end in "?".
const PROMPT = /^(walk me through|tell me|talk me through|describe|explain|give me|share|could you|can you|how|what|why|when)\b/i;

const sentencesOf = (text) => text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
const shorten = (s, max = 170) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/** Picks the speaker who is the candidate: by name first, otherwise whoever talks most (excluding the interviewer). */
export function guessCandidateSpeaker(turns, candidateName = '', interviewerName = '') {
  const speakers = [...new Set(turns.map((t) => t.speaker))];
  const first = (name) => name.toLowerCase().split(/\s+/)[0];
  const byName = speakers.find((s) => candidateName && s.toLowerCase().includes(first(candidateName)));
  if (byName) return byName;
  const words = (s) => turns.filter((t) => t.speaker === s).reduce((n, t) => n + t.text.split(/\s+/).length, 0);
  return speakers
    .filter((s) => !(interviewerName && s.toLowerCase().includes(first(interviewerName))))
    .sort((a, b) => words(b) - words(a))[0] || speakers[0];
}

export async function analyseTranscript({ turns, candidateSpeaker, criteria, requiredSkills }) {
  if (!USE_MOCK_AI) return callApi('analyse-transcript', { turns, candidateSpeaker, criteria, requiredSkills });
  await sleep(1500);

  const answers = turns.filter((t) => t.speaker === candidateSpeaker);
  // The question in each interviewer turn: its last sentence that asks something.
  const questions = turns
    .filter((t) => t.speaker !== candidateSpeaker)
    .map((t) => sentencesOf(t.text).filter((s) => s.endsWith('?') || PROMPT.test(s)).pop())
    .filter((q) => q && !/any questions for (me|us)/i.test(q));
  const sentences = answers.flatMap((t) => sentencesOf(t.text));
  const said = sentences.join(' ').toLowerCase();
  const hesitant = sentences.filter((s) => HESITATION.test(s));
  const avgWords = answers.length ? answers.reduce((n, t) => n + t.text.split(/\s+/).length, 0) / answers.length : 0;

  const ratings = {};
  const evidence = {};
  const quoted = new Set(); // prefer a different quote for each criterion
  for (const c of criteria) {
    const isTechnical = /technical|expertise|depth/i.test(c.name);
    const words = CRITERION_SIGNALS.find((s) => s.match.test(c.name))?.words ?? [];
    const signals = [...words, ...(isTechnical ? requiredSkills.map((s) => s.toLowerCase()) : [])];
    const found = sentences.filter((s) => signals.some((w) => s.toLowerCase().includes(w)) && !HESITATION.test(s));

    let score = found.length >= 6 ? 5 : found.length >= 3 ? 4 : found.length >= 1 ? 3 : 2;
    if (isTechnical && hesitant.length) score -= 1;
    if (/communication/i.test(c.name)) {
      // Clear answers of a sensible length, with structure, and few "not sure" moments.
      score = 3 + (avgWords >= 25 && avgWords <= 90 ? 1 : 0) + (found.length >= 3 ? 1 : 0) - (hesitant.length >= 3 ? 1 : 0);
    }
    ratings[c.name] = Math.max(1, Math.min(5, score));
    evidence[c.name] = [...found.filter((s) => !quoted.has(s)), ...found.filter((s) => quoted.has(s))].slice(0, 2);
    evidence[c.name].forEach((s) => quoted.add(s));
    evidence[c.name] = evidence[c.name].map((s) => shorten(s));
  }

  const skillsMentioned = requiredSkills.filter((s) => said.includes(s.toLowerCase()));
  const strongest = criteria.filter((c) => ratings[c.name] >= 4).sort((a, b) => ratings[b.name] - ratings[a.name]).slice(0, 3);
  const weakest = criteria.filter((c) => ratings[c.name] <= 2);
  const weighted = criteria.reduce((n, c) => n + ratings[c.name] * c.weight, 0) / criteria.reduce((n, c) => n + c.weight, 0);
  const lastTurn = turns[turns.length - 1];
  const minutes = lastTurn?.seconds != null ? Math.max(1, Math.round(lastTurn.seconds / 60)) : null;

  return {
    candidateSpeaker,
    minutes,
    questionCount: questions.length,
    summary:
      `${minutes ? `${minutes}-minute interview` : 'Interview'} with ${questions.length} questions. ` +
      (skillsMentioned.length ? `${candidateSpeaker} discussed ${skillsMentioned.join(', ')}. ` : '') +
      (strongest.length ? `Strongest areas: ${strongest.map((c) => c.name).join(', ')}. ` : '') +
      (hesitant.length ? `Showed uncertainty in ${hesitant.length} answer${hesitant.length > 1 ? 's' : ''}.` : 'Answered confidently throughout.'),
    ratings,
    evidence,
    strengths: strongest.map((c) => `${c.name}: "${evidence[c.name][0] ?? ''}"`).join('\n'),
    concerns: [
      ...hesitant.map((s) => `"${shorten(s)}"`),
      ...weakest.map((c) => `Little evidence of ${c.name.toLowerCase()} in the conversation.`),
    ].join('\n') || 'No clear concerns in the transcript.',
    details: `Questions covered:\n${questions.map((q) => `• ${shorten(q, 120)}`).join('\n')}`,
    decision: weighted >= 3.8 ? 'Proceed' : weighted >= 3 ? 'Hold' : 'Reject',
  };
}
