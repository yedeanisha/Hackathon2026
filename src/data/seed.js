// Demo data. Dates are relative to "now" so the demo always looks current.
// In production this lives in Firestore; the shapes below match the planned collections.
import { daysFromNow } from '../utils';

export const DECISIONS = ['Proceed', 'Hold', 'Reject', 'Recommend for another role'];

export const INTERVIEW_TYPES = [
  { id: 'technical', label: 'Technical' },
  { id: 'behavioural', label: 'Behavioural' },
  { id: 'managerial', label: 'Managerial' },
  { id: 'hr', label: 'HR' },
];

export const CANDIDATE_STATUSES = [
  'New', 'Screening', 'Interviewing', 'On hold', 'Offer', 'Rejected', 'Redirected',
];

// All demo accounts use @teksystems.demo emails and the password Demo@2026
// (stored only as a hash, see src/auth/password.js; Firebase keeps its own copy).

export function buildSeed() {
  const users = [
    { id: 'u1', role: 'owner', name: 'Ananya Rao', email: 'ananya.rao@teksystems.demo', passwordHash: '94e58529968cd66fce9e3e084caf76ecb10480c765d13028fa31f774d5cc0be8', title: 'Engineering Manager', department: 'Engineering' },
    {
      id: 'u2', role: 'interviewer', name: 'Rahul Mehta', email: 'rahul.mehta@teksystems.demo', passwordHash: '6fa6c43ce6ecc94424959a8307a7839d78c4a8bd29aeb5cf9735dd0586c9da4a',
      title: 'Senior Software Engineer', designation: 'Senior Software Engineer', department: 'Engineering',
      expertise: ['Java', 'Spring Boot', 'Microservices', 'REST APIs', 'System Design'], experience: 8,
      availability: 'Mon–Thu, 10:00–17:00',
    },
    {
      id: 'u3', role: 'interviewer', name: 'Sarah Thomas', email: 'sarah.thomas@teksystems.demo', passwordHash: '98844fdf6f2e88f47512578c944df89bec9cd5e3b80fb11025e386c4b9c1f0a7',
      title: 'Engineering Director', designation: 'Engineering Director', department: 'Engineering',
      expertise: ['Leadership', 'System Design', 'Architecture', 'Stakeholder Management', 'Microservices'], experience: 15,
      availability: 'Tue & Thu, 14:00–18:00',
    },
    {
      id: 'u4', role: 'interviewer', name: 'Priya Nair', email: 'priya.nair@teksystems.demo', passwordHash: '51bcd24cc7203f1379f94477087aafa962885a03b9762c176691262f3d468047',
      title: 'HR Business Partner', designation: 'HR Business Partner', department: 'Human Resources',
      expertise: ['Behavioural', 'Culture Fit', 'Compensation', 'Communication'], experience: 10,
      availability: 'Mon–Fri, 09:00–13:00',
    },
    {
      id: 'u5', role: 'interviewer', name: 'Arjun Singh', email: 'arjun.singh@teksystems.demo', passwordHash: '7daaf6ac31e2c4a3e296430a4f9cad685c36b65c099db73025ddff2904413259',
      title: 'Staff Data Engineer', designation: 'Staff Data Engineer', department: 'Data',
      expertise: ['Python', 'SQL', 'Spark', 'BigQuery', 'Airflow', 'GCP'], experience: 11,
      availability: 'Mon, Wed, Fri, 11:00–17:00',
    },
    { id: 'u6', role: 'admin', name: 'Meera Kapoor', email: 'meera.kapoor@teksystems.demo', passwordHash: 'cb410aeb0553f6cc344778d104cb78a9e31bdc8d04d7208df7529fbfccba3832', title: 'HR Operations Lead', department: 'Human Resources' },
    {
      id: 'u8', role: 'interviewer', name: 'Emily Clarke', email: 'emily.clarke@teksystems.demo', passwordHash: 'c51c6cdede68317f4eb517b5a0d241474ccaae3218ae5c272d9af2600058fcc8',
      title: 'Engineering Manager', designation: 'Engineering Manager', department: 'Engineering',
      expertise: ['Leadership', 'Java', 'System Design', 'Stakeholder Management', 'Microservices'], experience: 12,
      availability: 'Mon–Wed, 13:00–17:30',
    },
    {
      id: 'u9', role: 'interviewer', name: 'Oliver Bennett', email: 'oliver.bennett@teksystems.demo', passwordHash: 'ee4548ae7007e60d8a1bf16fe24135999f6013f044767e1f28f2607c71dd6a37',
      title: 'Senior Data Engineer', designation: 'Senior Data Engineer', department: 'Data',
      expertise: ['Python', 'SQL', 'BigQuery', 'Airflow', 'Spark', 'Data Modelling'], experience: 9,
      availability: 'Tue–Fri, 09:30–15:00',
    },
    {
      id: 'u10', role: 'interviewer', name: 'Sneha Kulkarni', email: 'sneha.kulkarni@teksystems.demo', passwordHash: 'a58f02e411952f874f749d0ac95f062a8222f90d32b5e9ce5655cb81d8494f65',
      title: 'Talent Acquisition Partner', designation: 'Talent Acquisition Partner', department: 'Human Resources',
      expertise: ['Behavioural', 'Culture Fit', 'Communication', 'Compensation'], experience: 7,
      availability: 'Mon–Fri, 10:00–16:00',
    },
    { id: 'u11', role: 'admin', name: 'James Whitfield', email: 'james.whitfield@teksystems.demo', passwordHash: '3db3952b11dbe53654fb1df090b963a1143ace8ca946467bb6a52acfe1ffdf8a', title: 'HR Operations Manager', department: 'Human Resources' },
    // Candidate accounts: linked to candidate records with the same email.
    { id: 'u7', role: 'candidate', name: 'Neha Sharma', email: 'neha.sharma@teksystems.demo', passwordHash: '3c45d2ae042417ea2aa8e7aeba16fb121ff009c6d7f44b0d5b6f00f000ae9e2f', title: 'Candidate' },
    { id: 'u12', role: 'candidate', name: 'Vikram Patel', email: 'vikram.patel@teksystems.demo', passwordHash: 'c40080d51105a67b9fc6d5a7e92115114df1175146bcd18898136b4790c74041', title: 'Candidate' },
    { id: 'u13', role: 'candidate', name: 'Charlotte Hughes', email: 'charlotte.hughes@teksystems.demo', passwordHash: '30a9e1438b0f6e48480d3fd94306b670bb5df05afb886d8cbc74ff78771821c6', title: 'Candidate' },
    { id: 'u14', role: 'candidate', name: 'Thomas Wright', email: 'thomas.wright@teksystems.demo', passwordHash: 'c3cf68374c8d48e77fd6ab2307f4b2ddd7fbc51bef1082a8712475725fc5c46b', title: 'Candidate' },
  ];

  const projects = [
    {
      id: 'p1', ownerId: 'u1', status: 'Active', createdAt: daysFromNow(-14),
      role: 'Backend Engineer', designation: 'Senior Software Engineer (L3)', department: 'Engineering',
      description:
        'Design, build and operate the core payments and order services that power our commerce platform. You will own services end to end, from API design to production reliability, working closely with product and platform teams.',
      responsibilities:
        'Own the design and delivery of backend microservices\nImprove reliability, observability and performance\nReview code and mentor mid-level engineers\nPartner with product on technical scoping',
      requiredSkills: ['Java', 'Spring Boot', 'Microservices', 'REST APIs', 'SQL', 'GCP'],
      stages: [
        { id: 's1', name: 'Technical round 1', type: 'technical' },
        { id: 's2', name: 'Managerial round', type: 'managerial' },
        { id: 's3', name: 'HR discussion', type: 'hr' },
      ],
      criteria: [
        { name: 'Technical depth', weight: 30 },
        { name: 'Problem solving', weight: 25 },
        { name: 'Communication', weight: 15 },
        { name: 'Collaboration', weight: 15 },
        { name: 'Culture & values', weight: 15 },
      ],
    },
    {
      id: 'p2', ownerId: 'u1', status: 'Active', createdAt: daysFromNow(-9),
      role: 'Data Engineer', designation: 'Data Engineer II', department: 'Data',
      description:
        'Build reliable batch and streaming pipelines on Google Cloud that feed analytics and ML use cases across the business.',
      responsibilities:
        'Build and maintain data pipelines on BigQuery and Dataflow\nModel data for analytics consumers\nImplement data quality checks and monitoring',
      requiredSkills: ['Python', 'SQL', 'Spark', 'BigQuery', 'Airflow', 'GCP'],
      stages: [
        { id: 's1', name: 'Technical round', type: 'technical' },
        { id: 's2', name: 'Behavioural round', type: 'behavioural' },
        { id: 's3', name: 'HR discussion', type: 'hr' },
      ],
      criteria: [
        { name: 'Technical depth', weight: 30 },
        { name: 'Data modelling', weight: 20 },
        { name: 'Problem solving', weight: 20 },
        { name: 'Communication', weight: 15 },
        { name: 'Ownership', weight: 15 },
      ],
    },
  ];

  const candidates = [
    {
      id: 'c1', projectId: 'p1', name: 'Vikram Patel', email: 'vikram.patel@teksystems.demo', phone: '+44 7700 900123', location: 'London, UK',
      currentRole: 'Software Engineer at FinPay', experience: 6, education: 'B.Tech Computer Science',
      skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka', 'AWS', 'REST APIs'],
      summary: 'Backend engineer with 6 years building payment services in Java and Spring Boot. Led migration of a monolith to event-driven microservices.',
      highlights: ['Cut payment API latency by 40% through caching and query tuning', 'Led a team of 3 on a Kafka-based ledger service', 'On-call owner for services handling 2M transactions/day'],
      fitScore: 84, fitReason: 'Matches 4 of 6 required skills (Java, Spring Boot, Microservices, REST APIs). Strong payments domain experience.',
      gaps: ['SQL', 'GCP'], status: 'Interviewing', resumeName: 'Vikram_Patel_CV.pdf', addedAt: daysFromNow(-12),
    },
    {
      id: 'c2', projectId: 'p1', name: 'Neha Sharma', email: 'neha.sharma@teksystems.demo', phone: '+44 7700 900456', location: 'Manchester, UK',
      currentRole: 'Backend Developer at CloudCart', experience: 4, education: 'M.Sc Software Engineering',
      skills: ['Java', 'REST APIs', 'SQL', 'GCP', 'Docker'],
      summary: 'Backend developer focused on Java REST services deployed on Google Cloud.',
      highlights: ['Built order-tracking APIs on Cloud Run', 'Designed PostgreSQL schemas for the catalogue service', 'Introduced contract testing across 6 services'],
      fitScore: 76, fitReason: 'Matches 4 of 6 required skills (Java, REST APIs, SQL, GCP). Less microservices depth.',
      gaps: ['Spring Boot', 'Microservices'], status: 'Interviewing', resumeName: 'Neha_Sharma_Resume.pdf', addedAt: daysFromNow(-10),
    },
    {
      id: 'c3', projectId: 'p1', name: 'Daniel Joseph', email: 'daniel.joseph@teksystems.demo', phone: '+44 7700 900789', location: 'Remote',
      currentRole: 'Full-stack Engineer at ShopLite', experience: 7, education: 'B.Sc Computer Science',
      skills: ['Node.js', 'React', 'Microservices', 'REST APIs', 'MongoDB'],
      summary: 'Full-stack engineer with strong Node.js and React background.',
      highlights: ['Shipped a React storefront used by 300k monthly users', 'Built Node.js microservices for checkout'],
      fitScore: 52, fitReason: 'Matches 2 of 6 required skills (Microservices, REST APIs). Primary stack is Node.js, not Java.',
      gaps: ['Java', 'Spring Boot', 'SQL', 'GCP'], status: 'Redirected', resumeName: 'Daniel_Joseph_CV.pdf', addedAt: daysFromNow(-11),
    },
    {
      id: 'c4', projectId: 'p2', name: 'Fatima Khan', email: 'fatima.khan@teksystems.demo', phone: '+44 7700 900321', location: 'Birmingham, UK',
      currentRole: 'Data Engineer at RetailIQ', experience: 5, education: 'M.Sc Data Science',
      skills: ['Python', 'SQL', 'Spark', 'BigQuery', 'Airflow', 'dbt'],
      summary: 'Data engineer building analytics platforms on BigQuery and Airflow.',
      highlights: ['Migrated a 40TB warehouse to BigQuery', 'Built 120+ Airflow DAGs with data-quality checks', 'Reduced pipeline cost by 30%'],
      fitScore: 91, fitReason: 'Matches 5 of 6 required skills (Python, SQL, Spark, BigQuery, Airflow). Hands-on BigQuery migration.',
      gaps: ['GCP'], status: 'Interviewing', resumeName: 'Fatima_Khan_Resume.pdf', addedAt: daysFromNow(-8),
    },
    {
      id: 'c5', projectId: 'p2', name: 'Kiran Das', email: 'kiran.das@teksystems.demo', phone: '+44 7700 900654', location: 'Leeds, UK',
      currentRole: 'Data Analyst at InsureCo', experience: 3, education: 'B.Sc Statistics',
      skills: ['Python', 'SQL', 'Pandas', 'Tableau'],
      summary: 'Analyst moving into data engineering, strong in SQL and Python.',
      highlights: ['Automated weekly reporting with Python', 'Built SQL models for claims analytics'],
      fitScore: 58, fitReason: 'Matches 2 of 6 required skills (Python, SQL). Limited pipeline engineering experience.',
      gaps: ['Spark', 'BigQuery', 'Airflow', 'GCP'], status: 'Interviewing', resumeName: 'Kiran_Das_CV.pdf', addedAt: daysFromNow(-7),
    },
    {
      id: 'c6', projectId: 'p1', name: 'Charlotte Hughes', email: 'charlotte.hughes@teksystems.demo', phone: '+44 7700 900246', location: 'London, UK',
      currentRole: 'Senior Java Developer at BrightLedger', experience: 7, education: 'M.Eng Computer Science',
      skills: ['Java', 'Spring Boot', 'Microservices', 'REST APIs', 'SQL', 'GCP', 'Kafka'],
      summary: 'Senior Java developer building payment and ledger microservices on Google Cloud.',
      highlights: ['Re-architected a settlement service to handle 3x peak volume', 'Introduced contract testing across 12 services', 'Mentors three junior engineers'],
      fitScore: 94, fitReason: 'Matches all 6 required skills (Java, Spring Boot, Microservices, REST APIs, SQL, GCP). Strong payments background.',
      gaps: [], status: 'Screening', resumeName: 'Charlotte_Hughes_CV.pdf', addedAt: daysFromNow(-2),
    },
    {
      id: 'c7', projectId: 'p2', name: 'Thomas Wright', email: 'thomas.wright@teksystems.demo', phone: '+44 7700 900135', location: 'Bristol, UK',
      currentRole: 'Analytics Engineer at CityMetrics', experience: 4, education: 'B.Sc Mathematics',
      skills: ['Python', 'SQL', 'dbt', 'BigQuery', 'Looker'],
      summary: 'Analytics engineer modelling data in BigQuery with dbt, moving towards pipeline engineering.',
      highlights: ['Built the dbt project behind 40+ dashboards', 'Cut BigQuery query costs by 25% with partitioning'],
      fitScore: 71, fitReason: 'Matches 3 of 6 required skills (Python, SQL, BigQuery). Less experience with orchestration and Spark.',
      gaps: ['Spark', 'Airflow', 'GCP'], status: 'New', resumeName: 'Thomas_Wright_CV.pdf', addedAt: daysFromNow(-1),
    },
  ];

  const assignments = [
    {
      id: 'a1', projectId: 'p1', candidateId: 'c1', stageId: 's1', stageName: 'Technical round 1', type: 'technical',
      interviewerIds: ['u2', 'u3'], fdmId: 'u3', schedule: daysFromNow(-3, 11),
      expectations: 'Assess microservice design, Spring Boot depth and production ownership. Include one system design exercise.',
      createdAt: daysFromNow(-6), createdBy: 'u1',
    },
    {
      id: 'a2', projectId: 'p1', candidateId: 'c2', stageId: 's1', stageName: 'Technical round 1', type: 'technical',
      interviewerIds: ['u2'], fdmId: 'u2', schedule: daysFromNow(2, 14),
      expectations: 'Focus on Spring Boot and microservices, which are gaps on the resume.',
      createdAt: daysFromNow(-2), createdBy: 'u1',
    },
    {
      id: 'a3', projectId: 'p2', candidateId: 'c4', stageId: 's1', stageName: 'Technical round', type: 'technical',
      interviewerIds: ['u5', 'u2'], fdmId: 'u5', schedule: daysFromNow(-2, 15),
      expectations: 'Pipeline design on GCP, BigQuery optimisation, data quality approach.',
      createdAt: daysFromNow(-5), createdBy: 'u1',
    },
    {
      id: 'a4', projectId: 'p2', candidateId: 'c5', stageId: 's1', stageName: 'Technical round', type: 'technical',
      interviewerIds: ['u5'], fdmId: 'u5', schedule: daysFromNow(-4, 10),
      expectations: 'Check readiness to move from analytics to engineering.',
      createdAt: daysFromNow(-6), createdBy: 'u1',
    },
    {
      id: 'a5', projectId: 'p1', candidateId: 'c3', stageId: 's1', stageName: 'Technical round 1', type: 'technical',
      interviewerIds: ['u2'], fdmId: 'u2', schedule: daysFromNow(-6, 16),
      expectations: 'Assess Java readiness given a Node.js background.',
      createdAt: daysFromNow(-9), createdBy: 'u1',
    },
  ];

  const feedback = [
    {
      id: 'f1', assignmentId: 'a1', interviewerId: 'u2', submittedAt: daysFromNow(-3, 15),
      ratings: { 'Technical depth': 4, 'Problem solving': 4, Communication: 3, Collaboration: 4, 'Culture & values': 4 },
      strengths: 'Strong grasp of Spring Boot internals and microservice patterns. Designed an idempotent payment API cleanly.',
      concerns: 'Limited hands-on GCP; relied on AWS equivalents. Explanations were sometimes rushed.',
      details: 'Walked through a saga-based order flow with good failure handling. Could improve on SQL indexing questions.',
      decision: 'Proceed',
    },
    {
      id: 'f2', assignmentId: 'a3', interviewerId: 'u5', submittedAt: daysFromNow(-2, 18),
      ratings: { 'Technical depth': 5, 'Data modelling': 5, 'Problem solving': 4, Communication: 4, Ownership: 4 },
      strengths: 'Excellent BigQuery partitioning and clustering knowledge. Clear data modelling for star schemas.',
      concerns: 'Has not used Dataflow in production.',
      details: 'Designed an end-to-end pipeline with sensible data-quality gates and cost controls.',
      decision: 'Proceed',
    },
    {
      id: 'f3', assignmentId: 'a3', interviewerId: 'u2', submittedAt: daysFromNow(-1, 10),
      ratings: { 'Technical depth': 4, 'Data modelling': 4, 'Problem solving': 4, Communication: 5, Ownership: 5 },
      strengths: 'Very structured communicator. Strong ownership of past migration project.',
      concerns: 'Python code quality was average under time pressure.',
      details: 'Good trade-off discussion between batch and streaming.',
      decision: 'Proceed',
    },
    {
      id: 'f4', assignmentId: 'a4', interviewerId: 'u5', submittedAt: daysFromNow(-4, 16),
      ratings: { 'Technical depth': 3, 'Data modelling': 3, 'Problem solving': 3, Communication: 4, Ownership: 4 },
      strengths: 'Solid SQL and a good attitude to learning.',
      concerns: 'No experience with Spark or orchestration tools. Pipeline design answer was shallow.',
      details: 'Would be a good fit for a junior role or after 6 months of upskilling.',
      decision: 'Hold',
    },
    {
      id: 'f5', assignmentId: 'a5', interviewerId: 'u2', submittedAt: daysFromNow(-6, 18),
      ratings: { 'Technical depth': 3, 'Problem solving': 4, Communication: 4, Collaboration: 4, 'Culture & values': 4 },
      strengths: 'Strong Node.js microservices experience and product sense.',
      concerns: 'Java and Spring Boot knowledge is basic.',
      details: 'Great engineer, wrong stack for this role. Better suited to our Full-stack Engineer opening.',
      decision: 'Recommend for another role', altRole: 'Full-stack Engineer',
    },
  ];

  const finalDecisions = [
    {
      assignmentId: 'a4', fdmId: 'u5', decision: 'Hold', submittedAt: daysFromNow(-3, 10), aiAssisted: true,
      summary: 'Candidate shows solid SQL fundamentals and communication but lacks hands-on pipeline engineering (Spark, Airflow).',
      rationale: 'Recommend keeping on hold and revisiting if we open a junior data engineering position.',
      ownerStatus: 'pending',
    },
    {
      assignmentId: 'a5', fdmId: 'u2', decision: 'Recommend for another role', altRole: 'Full-stack Engineer',
      submittedAt: daysFromNow(-5, 12), aiAssisted: false,
      summary: 'Strong Node.js/React engineer; Java depth below the bar for this role.',
      rationale: 'Refer to the Full-stack Engineer hiring team.',
      ownerStatus: 'approved', ownerNote: 'Agreed. Referred to the Full-stack team.', reviewedAt: daysFromNow(-4, 9),
    },
  ];

  const notifications = [
    { id: 'n1', userId: 'u3', type: 'reminder', text: 'Reminder: feedback for Vikram Patel (Technical round 1) is overdue.', link: '/interviews/a1', read: false, at: daysFromNow(-1, 9) },
    { id: 'n2', userId: 'u5', type: 'action', text: 'All feedback received for Fatima Khan. Please submit the final decision.', link: '/interviews/a3', read: false, at: daysFromNow(-1, 10) },
    { id: 'n3', userId: 'u1', type: 'approval', text: 'Final decision submitted for Kiran Das (Hold). Awaiting your approval.', link: '/approvals', read: false, at: daysFromNow(-3, 10) },
    { id: 'n4', userId: 'u2', type: 'assignment', text: 'New interview assigned: Neha Sharma – Technical round 1.', link: '/interviews/a2', read: false, at: daysFromNow(-2, 9) },
    { id: 'n6', userId: 'u7', type: 'assignment', text: 'Your Technical round 1 for Backend Engineer has been scheduled. Please confirm the slot.', link: '/', read: false, at: daysFromNow(-2, 9) },
    { id: 'n5', userId: 'u3', type: 'assignment', text: 'You are the Final Decision Maker for Vikram Patel – Technical round 1.', link: '/interviews/a1', read: true, at: daysFromNow(-6, 9) },
  ];

  const audit = [
    { id: 'l1', at: daysFromNow(-14, 9), actorId: 'u1', action: 'Project created', detail: 'Backend Engineer (Senior Software Engineer (L3))' },
    { id: 'l2', at: daysFromNow(-12, 11), actorId: 'u1', action: 'Candidate added', detail: 'Vikram Patel → Backend Engineer (AI fit 84)' },
    { id: 'l3', at: daysFromNow(-6, 9), actorId: 'u1', action: 'Interview assigned', detail: 'Vikram Patel – Technical round 1 → Rahul Mehta, Sarah Thomas (FDM: Sarah Thomas)' },
    { id: 'l4', at: daysFromNow(-6, 18), actorId: 'u2', action: 'Feedback submitted', detail: 'Daniel Joseph – Technical round 1: Recommend for another role' },
    { id: 'l5', at: daysFromNow(-5, 12), actorId: 'u2', action: 'Final decision submitted', detail: 'Daniel Joseph – Technical round 1: Recommend for another role' },
    { id: 'l6', at: daysFromNow(-4, 9), actorId: 'u1', action: 'Decision approved', detail: 'Daniel Joseph – Technical round 1' },
    { id: 'l7', at: daysFromNow(-3, 10), actorId: 'u5', action: 'Final decision submitted', detail: 'Kiran Das – Technical round: Hold (AI-assisted)' },
    { id: 'l8', at: daysFromNow(-3, 15), actorId: 'u2', action: 'Feedback submitted', detail: 'Vikram Patel – Technical round 1: Proceed' },
    { id: 'l9', at: daysFromNow(-1, 10), actorId: 'u2', action: 'Feedback submitted', detail: 'Fatima Khan – Technical round: Proceed' },
  ];

  return { currentUserId: null, users, projects, candidates, assignments, feedback, finalDecisions, notifications, audit };
}
