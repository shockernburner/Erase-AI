# EraseAI — Enterprise Deployment Guide (full HOW TO)

**For:** IT / CISO conversations · investor “how does Enterprise work?” · WiFi / central-server questions  
**Company:** Vantward Solutions Pte Ltd · eraseai.ai · director@vantward.com

---

## The one-minute answer

Enterprise WiFi **cannot read encrypted chat prompts** by itself. EraseAI uses **three pieces**:

1. **Endpoint (primary)** — browser extension / agent on each device reads the prompt **before Send**
2. **Network (backstop)** — firewall/DNS blocks AI sites unless traffic is governed
3. **Policy server (central)** — rules, audit logs, admin dashboard on **customer servers**

> *We don't depend on WiFi to enforce — control travels with the device. The network guarantees the only road to AI tools runs through EraseAI. The policy brain lives on the customer's own servers.*

---

## Why WiFi / router alone is not enough

| Network gear sees | Network gear does NOT see |
|-------------------|---------------------------|
| Device talked to `chat.openai.com` | Text pasted into the chat box |
| Time, volume, IP | PII, API keys, source code in the prompt |

ChatGPT/Claude/Gemini use **HTTPS**. Without **TLS inspection** (decrypt on gateway + company CA on every device), the central firewall only sees URLs — not prompt content.

**EraseAI's approach:** inspect at the **prompt layer on the device** (primary). Use the network as a **backstop** for bypass attempts — not as the main scanner.

---

## Reference architecture

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│  EMPLOYEE DEVICE    │     │  CORP WiFi / EGRESS FW   │     │   AI TOOLS      │
│  Extension / agent  │────▶│  Block direct AI paths   │────▶│ ChatGPT Claude  │
│  Inspect at Send    │     │  unless governed         │     │ Gemini Copilot  │
└─────────┬───────────┘     └──────────────────────────┘     └─────────────────┘
          │
          │ policies + audit sync
          ▼
┌─────────────────────────────────────────────────────────┐
│  ERASEAI POLICY SERVER — ON CUSTOMER INFRASTRUCTURE      │
│  Rules · audit store · admin dashboard · SSO · SIEM      │
└─────────────────────────────────────────────────────────┘
```

### Layer 1 — Endpoint (primary control)

- Browser extension / lightweight agent
- Inspects prompt + attachments **before** data reaches the model
- Force-installed via tools IT already uses:
  - **Chrome Enterprise** (extension policy)
  - **Microsoft Intune** / **Group Policy** (Windows)
  - **MDM** (Jamf, etc.) for managed Mac/iOS when available
- Identity via **corporate SSO** — every event tied to a user

### Layer 2 — Network (backstop)

- Existing **switch / egress firewall / DNS filter**
- Rule: **block direct traffic** to AI endpoints unless:
  - From a device running the EraseAI agent, **or**
  - Routed through an **EraseAI gateway** (optional future component)
- Catches: unmanaged laptops, scripts, personal devices on corp WiFi trying to bypass the extension

Typical vendors IT already has: Palo Alto, Fortinet, Zscaler, Cisco Umbrella, etc. — **DNS or egress rules**, not new cabling.

### Policy server (central — on customer servers)

Runs **on-prem** or **private cloud (VPC)**:

| Function | Purpose |
|----------|---------|
| Policy rules | Block/redact/warn by team, data class, app |
| Audit log store | Who sent what, blocks, overrides |
| Admin dashboard | IT/security console |
| SSO | Okta / Azure AD / Google Workspace |
| SIEM export | Splunk, Sentinel, etc. (Enterprise) |

Prompt inspection can stay **on-device**; server receives **verdicts + metadata** (stronger privacy story).

---

## What's live today vs what Enterprise sells

| Component | **Live today** | **Enterprise (seed roadmap / custom)** |
|-----------|----------------|----------------------------------------|
| Browser extension (ChatGPT, Claude, Gemini) | ✅ Chrome · tested | Force-install via Chrome Enterprise |
| Android firewall app | ✅ Play internal track | MDM deploy to corp phones |
| Cloud API + web billing | ✅ Stripe + eraseai.ai | VPC / dedicated tenant |
| Team admin + shared policy | 🔜 Building with seed | ✅ Core Enterprise upsell |
| On-prem **policy server** | ❌ Architecture defined | ✅ Customer infrastructure |
| Network **gateway / egress pack** | ❌ Architecture defined | ✅ Rules + optional proxy with IT |
| **SSO** (Okta, Azure AD) | ❌ | ✅ |
| **SIEM / audit export** | ❌ | ✅ |
| **Fail-closed** when agent offline | ❌ | ✅ Configurable per group |
| TLS MITM gateway (read prompts in network) | ❌ Not product thesis | Optional partner path only |

**Honest pitch today:** *"Pilot starts with managed browsers + extension. Policy server and network backstop are Enterprise phase — part of what the $2.5M seed builds toward with design partners."*

---

## Full HOW TO — Enterprise deployment (4 phases)

### Phase 0 — Prerequisites (IT checklist)

- [ ] List of **approved AI tools** (ChatGPT, Claude, Gemini, Copilot, etc.)
- [ ] **Managed devices** inventory (Windows, Mac, Chromebooks, Android)
- [ ] **IdP / SSO** (Okta, Azure AD, Google) for user identity
- [ ] **Egress firewall** or **DNS filter** admin access
- [ ] **Pilot department** (10–50 users, high AI usage — eng, marketing, support)
- [ ] **Legal / DPO** briefed (prompt scanning, audit retention, data residency)

---

### Phase 1 — Policy server (central)

**Goal:** Rules and audit live on **customer infrastructure**.

| Step | Action | Owner |
|------|--------|-------|
| 1.1 | Provision VM or K8s namespace (on-prem or VPC) | Customer IT |
| 1.2 | Install EraseAI policy server package *(Enterprise deliverable)* | EraseAI + IT |
| 1.3 | Connect **SSO** (SAML/OIDC) | IT + IdP admin |
| 1.4 | Configure **retention** for audit logs (90d / 1y / compliance) | Security + Legal |
| 1.5 | Create **pilot policies**: PII block, secrets block, violence block, allow Sanitize | Security |
| 1.6 | Smoke test: agent syncs policy, test user gets expected verdict | EraseAI CS |

**Outputs:** Admin URL, API keys for agents, audit pipeline ready.

---

### Phase 2 — Endpoint rollout (primary enforcement)

**Goal:** Every managed device inspects prompts **before Send**.

| Step | Action | Owner |
|------|--------|-------|
| 2.1 | **Chrome Enterprise:** publish EraseAI extension ID, force-install policy | IT |
| 2.2 | **Windows/Mac MDM:** deploy extension or desktop agent where applicable | IT |
| 2.3 | **Android (optional):** deploy via Managed Google Play / MDM | IT |
| 2.4 | Map extension to **SSO identity** (user email → audit trail) | IT |
| 2.5 | Pilot group only first — verify no workflow breakage | Pilot lead |
| 2.6 | Enable **local policy cache** + queued audit for offline/laptop travel | EraseAI config |

**Outputs:** ≥95% pilot devices with agent active; sample audit events in dashboard.

---

### Phase 3 — Network backstop (WiFi / egress)

**Goal:** No one on corp network reaches AI tools **without** going through governed path.

| Step | Action | Owner |
|------|--------|-------|
| 3.1 | Document **AI endpoint domains** (OpenAI, Anthropic, Google AI, Microsoft Copilot, etc.) | EraseAI + IT |
| 3.2 | **DNS filter / firewall:** block direct HTTPS to those domains by default | Network team |
| 3.3 | **Allow exceptions** for: (a) devices with EraseAI agent heartbeat, or (b) traffic via EraseAI gateway | Network team |
| 3.4 | **Guest WiFi:** either block AI entirely or captive “install agent” portal | Network team |
| 3.5 | Test bypass: script/curl to AI API from unmanaged laptop → **blocked** | Security |
| 3.6 | Test legit: managed laptop + extension → **works** | Pilot user |

**Example rule (conceptual):**

```
DENY  outbound TO ai-vendor-domains
UNLESS source IN managed-device-group WITH eraseai-agent=active
     OR destination VIA eraseai-gateway
```

**Note:** WiFi is just LAN path — same egress rules apply whether employee is on Ethernet or corp WiFi.

---

### Phase 4 — Pilot → production

| Step | Action | Owner |
|------|--------|-------|
| 4.1 | Run pilot **4–8 weeks** — tune false positives | Security + EraseAI |
| 4.2 | Weekly review: blocks, overrides, Sanitize usage | CISO |
| 4.3 | **SIEM** integration for alerts (Enterprise) | SecOps |
| 4.4 | Expand rollout by department | IT |
| 4.5 | **Fail-closed policy:** if agent can't sync N hours, block AI (or fail-open for low-risk groups) | CISO decision |
| 4.6 | Executive report: incidents prevented, policy compliance | EraseAI dashboard |

---

## Coverage by employee situation

| Employee state | What happens |
|----------------|--------------|
| **On LAN / corp WiFi, online** | Endpoint inspects prompt; network blocks bypass; full logging |
| **Remote, online** | Endpoint enforces alone; syncs policy/audit to server over internet/VPN |
| **Offline** | Cloud AI unreachable; agent uses **cached policy**; logs queue until reconnect |
| **Unmanaged device on guest WiFi** | Network backstop blocks AI (if guest VLAN has same egress rules) |
| **Personal phone, mobile data** | Outside corp control unless MDM + Android agent deployed |

---

## What to tell investors vs what to tell IT

### Investors (30 sec)

> "Enterprise is endpoint-first plus network backstop plus policy server on their infra. We're live on endpoint today; seed builds Team console and first design-partner deployments with SSO and audit."

### IT / CISO (30 sec)

> "Install our agent on managed browsers — that's where prompts are caught. Your firewall blocks direct AI access as backup. Policy and logs stay on your servers. Pilot one department in weeks, not a rip-and-replace network project."

---

## FAQ

**Can we only use the central server and skip endpoints?**  
No — not if you want prompt content inspection. Server holds policy and audit; **devices do the reading**.

**Is this a VPN?**  
No. The Android app declares no VPN service and does not route or block network traffic; it stops risky sends at the keyboard and Send button.

**Do you decrypt HTTPS on the gateway?**  
Not the default product. Optional partner integrations possible; primary thesis is **on-device prompt inspection**.

**How is this different from Zscaler / Purview?**  
They excel at network/SaaS DLP. EraseAI is **prompt-native at Send** across multiple LLMs — complementary until Team ARR proves consolidation.

**What can we sell tomorrow?**  
Extension + Android pilot on cloud API; honest roadmap for policy server + network pack with Enterprise contract.

---

## Related files in this repo

| File | Purpose |
|------|---------|
| `exports/EraseAI_Enterprise_Architecture_Brief.pdf` | Printable architecture brief |
| `artifacts/letterhead/` route `/enterprise-architecture` | Visual diagram source |
| `deliverables/EraseAI_Investor_Meeting_Playbook_2.5M.md` | Funding + hard Q&A |
| `artifacts/investor-deck/` slide **Enterprise Deployment** | Deck slide for meetings |

---

## Elevator line (memorize)

**"Endpoint inspects the prompt. WiFi blocks the bypass. Policy server lives on your servers."**
