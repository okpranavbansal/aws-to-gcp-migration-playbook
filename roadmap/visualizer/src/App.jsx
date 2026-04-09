import { useState } from "react";

const phases = [
  {
    id: 1,
    phase: "Phase 1",
    title: "Rebuild The Foundation",
    duration: "Months 1–3",
    subtitle: "\"I don't know anything\" → \"I know WHY things work\"",
    color: "#00ff88",
    darkColor: "#00cc6a",
    icon: "⚡",
    goal: "Stop using tools as black boxes. Understand what actually happens under the hood. This phase is about depth, not breadth.",
    warning: "Do NOT skip this. Everything after depends on it. Most engineers skip this and stay shallow forever.",
    weeks: [
      {
        title: "Weeks 1–2: How Computers Actually Work",
        items: [
          "How a CPU executes instructions — registers, memory, stack",
          "What RAM is vs disk — why it matters for your infra decisions",
          "How the OS kernel works — processes, threads, system calls",
          "What happens when you run a Docker container (really)",
          "Linux internals: file descriptors, signals, /proc filesystem",
        ],
        resources: [
          { name: "The Linux Command Line (book — free online)", url: "https://linuxcommand.org/tlcl.php" },
          { name: "MIT 6.004 — Computation Structures", url: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/" },
          { name: "Linux Kernel labs (hands-on)", url: "https://linux-kernel-labs.github.io/refs/heads/master/" },
        ],
        daily: "1 hour reading + 1 hour hands-on in a Linux VM. No shortcuts."
      },
      {
        title: "Weeks 3–4: Networking from Zero",
        items: [
          "TCP/IP — what actually happens in a 3-way handshake",
          "DNS — how a domain resolves, what TTL means, why it matters in K8s",
          "HTTP/HTTPS — headers, TLS handshake, certificates",
          "How load balancers work at OSI layer 4 vs layer 7",
          "VPC, subnets, CIDR — why you keep seeing /24 everywhere",
          "What happens when a K8s pod talks to another pod",
        ],
        resources: [
          { name: "Computer Networks: A Top Down Approach (Kurose)", url: "https://gaia.cs.umass.edu/kurose_ross/index.php" },
          { name: "Julia Evans — Networking zines (free)", url: "https://jvns.ca/networking-zine.pdf" },
          { name: "Beej's Guide to Network Programming", url: "https://beej.us/guide/bgnet/" },
        ],
        daily: "Build: set up your own DNS server. Capture traffic with tcpdump. Understand every packet."
      },
      {
        title: "Weeks 5–8: Systems Design Fundamentals",
        items: [
          "CAP theorem — why you can't have consistency + availability + partition tolerance",
          "Databases: ACID, transactions, indexes, query planning",
          "Distributed systems: consensus, leader election, replication",
          "Caching: where, when, why — Redis vs CDN vs in-memory",
          "Message queues: Kafka internals — partitions, offsets, consumer groups",
          "Load balancing algorithms: round robin, least connections, consistent hashing",
        ],
        resources: [
          { name: "Designing Data-Intensive Applications (Kleppmann) — THE book", url: "https://dataintensive.net/" },
          { name: "MIT 6.824 Distributed Systems (free lectures)", url: "https://pdos.csail.mit.edu/6.824/" },
          { name: "Martin Kleppmann's lectures on YouTube", url: "https://www.youtube.com/@kleppmann" },
        ],
        daily: "Read DDIA one chapter at a time. Implement small versions of what you read."
      },
      {
        title: "Weeks 9–12: Programming Depth (Python + Go)",
        items: [
          "Python internals: GIL, memory model, generators, async/await",
          "Write real scripts: automate your infra tasks, parse logs, query APIs",
          "Go basics: goroutines, channels, why it's the language of infra tools",
          "Build something: a simple HTTP server, a CLI tool, a monitoring script",
          "Data structures: why a hashmap is O(1), when to use a tree, what a bloom filter does",
          "Algorithms: sorting, searching, recursion — understand time complexity",
        ],
        resources: [
          { name: "Fluent Python (Ramalho) — best Python book", url: "https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/" },
          { name: "Go by Example (free)", url: "https://gobyexample.com/" },
          { name: "Neetcode.io — DSA (do 2 problems/day)", url: "https://neetcode.io/" },
        ],
        daily: "2 DSA problems every morning before work. Non-negotiable."
      },
    ],
    checkpoint: "Can you explain to a 10-year-old: what happens when you type google.com? What happens when a K8s pod starts? Why does Kafka not lose messages? If yes — move to Phase 2."
  },
  {
    id: 2,
    phase: "Phase 2",
    title: "Master Your Craft",
    duration: "Months 4–9",
    subtitle: "\"I know WHY\" → \"I can build and break anything\"",
    color: "#0088ff",
    darkColor: "#0066cc",
    icon: "🔧",
    goal: "Go from someone who runs tools to someone who understands them deeply enough to debug anything, optimize anything, and make architecture decisions.",
    warning: "This is where most engineers plateau. Don't just follow tutorials — break things intentionally and fix them.",
    weeks: [
      {
        title: "Months 4–5: Kubernetes — Real Depth",
        items: [
          "K8s internals: etcd, API server, scheduler, controller manager, kubelet",
          "How a pod is actually scheduled — resource requests vs limits",
          "Networking: CNI plugins, kube-proxy, iptables rules, CoreDNS",
          "Storage: PV, PVC, StorageClass — how GKE handles this vs EKS",
          "Security: RBAC, NetworkPolicies, PodSecurityAdmission, Workload Identity",
          "Operators and CRDs — how to extend Kubernetes",
          "Helm deep dive: templating, hooks, library charts",
          "GitOps with ArgoCD or Flux — declarative everything",
        ],
        resources: [
          { name: "Kubernetes in Action (Lukša) — best K8s book", url: "https://www.manning.com/books/kubernetes-in-action-second-edition" },
          { name: "CKA exam curriculum (study this like a bible)", url: "https://github.com/cncf/curriculum" },
          { name: "killer.sh — CKA practice (hardest simulator)", url: "https://killer.sh/" },
        ],
        daily: "Run a local K8s cluster (kind or minikube). Break it. Fix it. Every day."
      },
      {
        title: "Months 5–6: Cloud Architecture (GCP + AWS)",
        items: [
          "GCP deep dive: GKE Autopilot, Cloud Run, Pub/Sub, BigQuery, Cloud Armor",
          "GCP IAM and Workload Identity — understand every permission model",
          "AWS review: know it well enough to compare and contrast with GCP",
          "Multi-cloud networking: VPC peering, private interconnects, DNS across clouds",
          "FinOps: committed use discounts, sustained use, Spot/Preemptible VMs",
          "Disaster recovery: RTO, RPO, backup strategies, multi-region failover",
        ],
        resources: [
          { name: "GCP Professional Cloud Architect study guide", url: "https://cloud.google.com/certification/cloud-architect" },
          { name: "GCP architecture center (real examples)", url: "https://cloud.google.com/architecture" },
          { name: "AWS Well-Architected Framework", url: "https://aws.amazon.com/architecture/well-architected/" },
        ],
        daily: "Get GCP Associate Cloud Engineer cert this month. It's easy given your experience. Just do it."
      },
      {
        title: "Months 6–7: Observability & SRE Practice",
        items: [
          "SRE book by Google — read it cover to cover (it's free)",
          "SLIs, SLOs, error budgets — implement these for Wyzard",
          "Prometheus internals: TSDB, PromQL, recording rules, alerting rules",
          "Distributed tracing: how spans work, how Tempo collects from OpenTelemetry",
          "Log aggregation: Loki architecture, LogQL, structured logging best practices",
          "Incident management: runbooks, postmortems, blameless culture",
          "Chaos engineering: intentionally break prod (controlled) to find weaknesses",
        ],
        resources: [
          { name: "Google SRE Book (free)", url: "https://sre.google/sre-book/table-of-contents/" },
          { name: "Google SRE Workbook (free)", url: "https://sre.google/workbook/table-of-contents/" },
          { name: "Prometheus docs — read every page", url: "https://prometheus.io/docs/introduction/overview/" },
        ],
        daily: "Write one postmortem per week — even for small things. Build the habit."
      },
      {
        title: "Months 7–9: AI Infrastructure & LLMOps",
        items: [
          "How LLMs actually work: transformers, attention, tokens — not ML theory, just enough to make infra decisions",
          "LLM serving: latency vs throughput tradeoffs, batching, GPU memory",
          "Amazon Bedrock deep dive: model routing, guardrails, agents — you use this already",
          "RAG pipelines: vector databases, embeddings, retrieval — understand the infra",
          "LLMOps: model versioning, A/B testing, drift detection, cost-per-inference",
          "AI observability: LangSmith, Weights & Biases, custom metrics for LLM apps",
          "GPU infrastructure basics: CUDA, GPU memory, multi-GPU serving",
        ],
        resources: [
          { name: "Andrej Karpathy — Neural Networks: Zero to Hero (YouTube)", url: "https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ" },
          { name: "LLM Engineer's Handbook (free chapters)", url: "https://www.llm-engineer.com/" },
          { name: "AWS Bedrock docs — read everything", url: "https://docs.aws.amazon.com/bedrock/" },
        ],
        daily: "Build one LLMOps project: deploy an LLM, add observability, measure cost-per-inference."
      },
    ],
    checkpoint: "Can you design a system from scratch — databases, caching, queues, K8s, observability, cost? Can you do a CKA exam? Can you explain how your Bedrock chatbot actually works under the hood? If yes — Phase 3."
  },
  {
    id: 3,
    phase: "Phase 3",
    title: "Become a System Thinker",
    duration: "Months 10–18",
    subtitle: "\"I can build\" → \"I can architect and lead\"",
    color: "#ff6600",
    darkColor: "#cc5200",
    icon: "🏗️",
    goal: "Move from executing to designing. Start making decisions that affect teams. Build your public presence. Start thinking about product and business — not just infra.",
    warning: "This is where the CTO path diverges from the Staff Engineer path. You need BOTH technical depth AND business thinking.",
    weeks: [
      {
        title: "Months 10–12: System Design Mastery",
        items: [
          "Design real systems: URL shortener, Twitter, Uber, Netflix — from scratch",
          "API design: REST vs gRPC vs GraphQL — when to use what",
          "Database selection: when SQL, when NoSQL, when NewSQL, when time-series",
          "Scalability patterns: CQRS, event sourcing, saga pattern, outbox pattern",
          "Security architecture: zero trust, threat modeling, OWASP for infrastructure",
          "Cost architecture: design systems with FinOps in mind from day one",
        ],
        resources: [
          { name: "System Design Interview Vol 1 & 2 (Alex Xu)", url: "https://www.amazon.in/System-Design-Interview-insiders-Second/dp/B08CMF2CQF" },
          { name: "ByteByteGo newsletter + YouTube", url: "https://bytebytego.com/" },
          { name: "High Scalability blog (real architecture case studies)", url: "http://highscalability.com/" },
        ],
        daily: "Design one system per week. Write it down. Get it reviewed."
      },
      {
        title: "Months 12–15: Leadership & Influence",
        items: [
          "Technical writing: write one blog post per month — architecture decisions, migration stories",
          "Code reviews: review others' IaC and K8s configs with real feedback",
          "Mentoring: find one junior to help — teaching forces mastery",
          "RFC process: write architecture decision records (ADRs) for every major change",
          "On-call leadership: run incidents, not just fix them — coordinate, communicate, postmortem",
          "Speak at one meetup or internal session — forces you to structure knowledge",
        ],
        resources: [
          { name: "The Staff Engineer's Path (Tanya Reilly)", url: "https://www.oreilly.com/library/view/the-staff-engineers/9781098118723/" },
          { name: "An Elegant Puzzle — Systems of Engineering Management (Will Larson)", url: "https://press.stripe.com/an-elegant-puzzle" },
          { name: "Architecture Decision Records guide", url: "https://adr.github.io/" },
        ],
        daily: "Write something every week. LinkedIn post, internal doc, or blog. Public thinking compounds."
      },
      {
        title: "Months 15–18: Business & Product Thinking",
        items: [
          "Understand Wyzard's business model: how does the product make money?",
          "Learn basic P&L: what does your infra cost the company vs what it generates?",
          "Product sense: sit in on customer calls if possible, understand user pain",
          "Metrics that matter: DAU, CAC, LTV, churn — not just p99 latency",
          "Read about startups: how companies scale, what kills them, what CTO decisions matter",
          "Network intentionally: 2 coffee chats per month with senior engineers or founders",
        ],
        resources: [
          { name: "Zero to One (Peter Thiel) — how to think about building", url: "https://www.amazon.in/Zero-One-Notes-Startups-Future/dp/0804139296" },
          { name: "The Hard Thing About Hard Things (Ben Horowitz)", url: "https://www.amazon.in/Hard-Thing-About-Things-Building/dp/0062273205" },
          { name: "Lenny's Newsletter — product + growth thinking", url: "https://www.lennysnewsletter.com/" },
        ],
        daily: "One business/product article per day. 15 minutes. Build the mental model."
      },
    ],
    checkpoint: "Can you design a system AND explain its business tradeoffs? Can you write an ADR? Can you lead an incident? Are people coming to you for advice? If yes — Phase 4."
  },
  {
    id: 4,
    phase: "Phase 4",
    title: "The CTO/CEO Path",
    duration: "Year 3–5",
    subtitle: "\"I can lead\" → \"I can build companies\"",
    color: "#ff0088",
    darkColor: "#cc006a",
    icon: "🚀",
    goal: "At this point you're not just an engineer — you're a technical leader who understands product, people, and business. The CTO path is about leverage: making every engineer on your team 10x better.",
    warning: "Most engineers never make it here because they stay technical and ignore people/business. You have to want both.",
    weeks: [
      {
        title: "Year 3: Senior/Staff Engineer Level",
        items: [
          "Lead a major technical initiative — not just execute, but define the vision",
          "Hire or mentor engineers — build your taste for talent",
          "Own a platform or product area end-to-end — technical + product + business",
          "Get to ₹30–50 LPA at a top company OR meaningful equity at a startup",
          "Target: Google/Flipkart/Razorpay SRE, or founding engineer at AI startup",
        ],
        resources: [
          { name: "Target: Google L5 / Flipkart SE3 / Razorpay SDE3 level", url: "#" },
          { name: "Start angel investing or advising startups (build network)", url: "#" },
          { name: "Speak at conferences: KubeCon, GopherCon, SREcon", url: "https://events.linuxfoundation.org/kubecon-cloudnativecon-india/" },
        ],
        daily: "Your output is now other engineers. Measure yourself by what your team ships."
      },
      {
        title: "Year 4–5: CTO / Founding Engineer",
        items: [
          "Join a Series A startup as VP Engineering or CTO — or start your own",
          "Or: stay at a scaling company and become Head of Platform/Infrastructure",
          "Build the full technical org: hiring, culture, architecture, roadmap",
          "Fundraising literacy: understand term sheets, valuations, investor conversations",
          "CEO path: combine technical credibility with sales, vision, and team building",
        ],
        resources: [
          { name: "CTO Craft community", url: "https://ctocraft.com/" },
          { name: "The CTO Handbook (Yoav Abrahami)", url: "https://www.amazon.com/CTO-Handbook-Chief-Technology-Officers/dp/1737508907" },
          { name: "YC Startup School (free — understand how companies are built)", url: "https://www.startupschool.org/" },
        ],
        daily: "Think like an owner. Every decision has a cost, a timeline, and a business outcome."
      },
    ],
    checkpoint: "Are people calling you for advice? Are you building teams, not just systems? Do you understand the business as well as the tech? That's how you know you're ready."
  }
];

const certifications = [
  { order: 1, name: "GCP Associate Cloud Engineer", when: "Month 5", why: "Validates your live GCP/GKE migration immediately", priority: "🔴 Critical" },
  { order: 2, name: "CKA — Certified Kubernetes Administrator", when: "Month 6", why: "Single highest ROI cert for your profile. Recruiters filter by this.", priority: "🔴 Critical" },
  { order: 3, name: "Terraform Associate", when: "Month 7", why: "You use it daily. Just get the badge. 3 weeks prep.", priority: "🟡 High" },
  { order: 4, name: "AWS Solutions Architect Associate", when: "Month 8", why: "Completes the multi-cloud story. Big salary signal.", priority: "🟡 High" },
  { order: 5, name: "GCP Professional Cloud Architect", when: "Month 12", why: "Senior-level GCP cert. Unlocks architect roles.", priority: "🟢 Growth" },
  { order: 6, name: "CKS — Certified Kubernetes Security", when: "Month 14", why: "DevSecOps premium. Very few have this.", priority: "🟢 Growth" },
];

const dailySchedule = [
  { time: "6:00–7:00 AM", activity: "Gym", type: "health", icon: "💪" },
  { time: "7:30–8:30 AM", activity: "2 DSA problems (Neetcode)", type: "learning", icon: "🧩" },
  { time: "9:00 AM–6:00 PM", activity: "Work — but learn actively. Question everything.", type: "work", icon: "💻" },
  { time: "6:30–7:30 PM", activity: "Phase study (1 hour deep focus)", type: "learning", icon: "📚" },
  { time: "7:30–8:00 PM", activity: "Write — LinkedIn post / blog / ADR / notes", type: "build", icon: "✍️" },
  { time: "10:00–10:30 PM", activity: "Read — book chapter or long-form article", type: "learning", icon: "📖" },
];

export default function Roadmap() {
  const [activePhase, setActivePhase] = useState(1);
  const [activeWeek, setActiveWeek] = useState(0);

  const currentPhase = phases.find(p => p.id === activePhase);

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      background: "#0a0a0a",
      minHeight: "100vh",
      color: "#e0e0e0",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        padding: "40px 32px 24px",
        borderBottom: "1px solid #1a1a1a",
        background: "linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
            Pranav Bansal · April 2026 · Confidential
          </div>
          <h1 style={{
            fontSize: "clamp(24px, 5vw, 42px)",
            fontWeight: 700,
            margin: "0 0 8px",
            color: "#fff",
            letterSpacing: -1,
            lineHeight: 1.1,
          }}>
            Engineering → CTO
          </h1>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
            The honest roadmap. No shortcuts. ~5 years of compounding.
          </div>

          {/* Phase selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {phases.map(p => (
              <button
                key={p.id}
                onClick={() => { setActivePhase(p.id); setActiveWeek(0); }}
                style={{
                  background: activePhase === p.id ? p.color : "transparent",
                  border: `1px solid ${activePhase === p.id ? p.color : "#2a2a2a"}`,
                  color: activePhase === p.id ? "#000" : "#666",
                  padding: "6px 14px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "inherit",
                  fontWeight: activePhase === p.id ? 700 : 400,
                  letterSpacing: 1,
                  transition: "all 0.15s",
                }}
              >
                {p.icon} {p.phase}: {p.duration}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 32px" }}>

        {/* Phase header */}
        <div style={{
          borderLeft: `3px solid ${currentPhase.color}`,
          paddingLeft: 20,
          marginBottom: 32,
        }}>
          <div style={{ fontSize: 11, color: currentPhase.color, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
            {currentPhase.phase} · {currentPhase.duration}
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 4px", letterSpacing: -0.5 }}>
            {currentPhase.title}
          </h2>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 16, fontStyle: "italic" }}>
            {currentPhase.subtitle}
          </div>
          <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7, marginBottom: 12 }}>
            {currentPhase.goal}
          </div>
          <div style={{
            background: "#1a0a00",
            border: "1px solid #3a2000",
            borderRadius: 4,
            padding: "10px 14px",
            fontSize: 12,
            color: "#ff9900",
            lineHeight: 1.6,
          }}>
            ⚠️ {currentPhase.warning}
          </div>
        </div>

        {/* Week selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
          {currentPhase.weeks.map((w, i) => (
            <button
              key={i}
              onClick={() => setActiveWeek(i)}
              style={{
                background: activeWeek === i ? "#1a1a1a" : "transparent",
                border: `1px solid ${activeWeek === i ? currentPhase.color : "#2a2a2a"}`,
                color: activeWeek === i ? currentPhase.color : "#555",
                padding: "5px 12px",
                borderRadius: 3,
                cursor: "pointer",
                fontSize: 10,
                fontFamily: "inherit",
                letterSpacing: 0.5,
                transition: "all 0.15s",
              }}
            >
              {i + 1}. {w.title.split(":")[0]}
            </button>
          ))}
        </div>

        {/* Active week content */}
        {currentPhase.weeks[activeWeek] && (() => {
          const week = currentPhase.weeks[activeWeek];
          return (
            <div>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: currentPhase.color,
                margin: "0 0 20px",
                letterSpacing: 0.5,
              }}>
                {week.title}
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {/* What to learn */}
                <div style={{
                  background: "#0f0f0f",
                  border: "1px solid #1e1e1e",
                  borderRadius: 6,
                  padding: 20,
                }}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                    What to Learn
                  </div>
                  {week.items.map((item, i) => (
                    <div key={i} style={{
                      display: "flex",
                      gap: 10,
                      marginBottom: 10,
                      alignItems: "flex-start",
                    }}>
                      <span style={{ color: currentPhase.color, fontSize: 10, marginTop: 3, flexShrink: 0 }}>▸</span>
                      <span style={{ fontSize: 12, color: "#ccc", lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Resources + daily */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{
                    background: "#0f0f0f",
                    border: "1px solid #1e1e1e",
                    borderRadius: 6,
                    padding: 20,
                    flex: 1,
                  }}>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                      Resources
                    </div>
                    {week.resources.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: currentPhase.color,
                          marginBottom: 8,
                          textDecoration: "none",
                          lineHeight: 1.5,
                          opacity: 0.9,
                        }}
                      >
                        → {r.name}
                      </a>
                    ))}
                  </div>

                  <div style={{
                    background: "#0a0f0a",
                    border: `1px solid ${currentPhase.color}22`,
                    borderRadius: 6,
                    padding: 16,
                  }}>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                      Daily Practice
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7 }}>
                      {week.daily}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Checkpoint */}
        <div style={{
          background: "#0a0a0f",
          border: `1px solid ${currentPhase.color}33`,
          borderRadius: 6,
          padding: 20,
          marginTop: 8,
        }}>
          <div style={{ fontSize: 10, color: currentPhase.color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            ✓ Phase Checkpoint — Before You Move On
          </div>
          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.8, fontStyle: "italic" }}>
            {currentPhase.checkpoint}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#1a1a1a", margin: "40px 0" }} />

        {/* Certifications */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>
            Certification Roadmap — In Order
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {certifications.map((c, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr auto",
                gap: 16,
                alignItems: "center",
                background: "#0f0f0f",
                border: "1px solid #1a1a1a",
                borderRadius: 4,
                padding: "12px 16px",
              }}>
                <div style={{ fontSize: 11, color: "#444", fontWeight: 700 }}>#{c.order}</div>
                <div>
                  <div style={{ fontSize: 12, color: "#ddd", marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "#555" }}>{c.why}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{c.when}</div>
                  <div style={{ fontSize: 10 }}>{c.priority}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Schedule */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>
            Your Daily Schedule — Non-Negotiable
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dailySchedule.map((s, i) => {
              const colors = { health: "#00ff88", learning: "#0088ff", work: "#ff9900", build: "#ff0088" };
              return (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "120px 24px 1fr",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #111",
                }}>
                  <div style={{ fontSize: 10, color: "#444", fontFamily: "inherit" }}>{s.time}</div>
                  <div style={{ fontSize: 14 }}>{s.icon}</div>
                  <div style={{ fontSize: 12, color: colors[s.type] || "#888" }}>{s.activity}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* The honest truth */}
        <div style={{
          background: "#0f0f0f",
          border: "1px solid #2a2a2a",
          borderRadius: 6,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>
            The Honest Truth About This Path
          </div>
          {[
            ["You already have the most important thing", "Real production experience at 22. Most people studying theory don't have this. Your learning will be 3x faster because you have context."],
            ["\"I don't know anything\" is the right feeling", "It means your standards are higher than your current knowledge. That gap closes with deliberate practice — not more tutorials."],
            ["CTO is not a technical title", "It's a leadership title that requires technical credibility. Start building both right now — not in 3 years."],
            ["Consistency beats intensity", "1 hour every day for 2 years > 10 hours for 1 month. The schedule above is designed for sustainability."],
            ["Write publicly, always", "Your 5,158 followers are a compounding asset. Every post you write is a job application, a reference, and a proof of work."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < 4 ? "1px solid #1a1a1a" : "none" }}>
              <div style={{ fontSize: 12, color: "#00ff88", marginBottom: 4 }}>→ {title}</div>
              <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 10, color: "#333", letterSpacing: 2, paddingBottom: 40 }}>
          PRANAV BANSAL · ENGINEERING ROADMAP · APRIL 2026 · CONFIDENTIAL
        </div>
      </div>
    </div>
  );
}
