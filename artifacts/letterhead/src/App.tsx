import { Switch, Route, Router as WouterRouter } from "wouter";

function Letterhead() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e8e8e8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      <button
        className="no-print"
        onClick={() => window.print()}
        style={{
          marginBottom: 16,
          padding: "10px 28px",
          background: "#162a47",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          cursor: "pointer",
          letterSpacing: "0.5px",
        }}
      >
        Print / Save as PDF
      </button>

      <div
        className="letterhead-page"
        style={{
          width: "210mm",
          minHeight: "297mm",
          background: "#fff",
          boxShadow: "0 2px 16px rgba(0,0,0,0.13)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 6,
            background: "linear-gradient(90deg, #162a47 0%, #162a47 60%, #28a868 60%, #28a868 100%)",
          }}
        />

        <div
          style={{
            padding: "28px 48px 20px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1.5px solid #e2e6ec",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src={`${import.meta.env.BASE_URL}logo.jpg`}
              alt="Vantward Solutions"
              style={{ height: 62, width: "auto", objectFit: "contain" }}
            />
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#162a47",
                  letterSpacing: "1.5px",
                  lineHeight: 1.15,
                  fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
                }}
              >
                VANTWARD SOLUTIONS
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#28a868",
                  letterSpacing: "3px",
                  fontWeight: 500,
                  marginTop: 2,
                  fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
                }}
              >
                PTE. LTD.
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: 10,
              color: "#555",
              lineHeight: 1.7,
              fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              paddingTop: 8,
            }}
          >
            <div>68 Circular Road, #02-01</div>
            <div>Singapore 049422</div>
            <div style={{ marginTop: 4 }}>
              <span style={{ color: "#162a47", fontWeight: 600 }}>W</span>{" "}
              +852 9057 6851
            </div>
            <div>
              <span style={{ color: "#162a47", fontWeight: 600 }}>E</span>{" "}
              director@vantward.com
            </div>
            <div style={{ marginTop: 4, color: "#999", fontSize: 9 }}>
              Reg. No. 202606980C
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: "36px 48px 48px 48px",
            minHeight: "700px",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: 13,
              fontStyle: "italic",
              textAlign: "center",
              marginTop: 200,
              fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            }}
          >
            [ Letter content area ]
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #e2e6ec",
            padding: "14px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 9,
            color: "#999",
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          }}
        >
          <span>Vantward Solutions Pte. Ltd. | Reg. No. 202606980C</span>
          <span>68 Circular Road, #02-01, Singapore 049422</span>
          <span>director@vantward.com</span>
        </div>

        <div
          style={{
            height: 5,
            background: "linear-gradient(90deg, #28a868 0%, #28a868 40%, #162a47 40%, #162a47 100%)",
          }}
        />
      </div>
    </div>
  );
}

function LetterheadClean() {
  return (
    <div style={{ background: "#fff", width: "210mm", minHeight: "297mm", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <div style={{ height: 6, background: "linear-gradient(90deg, #162a47 0%, #162a47 60%, #28a868 60%, #28a868 100%)" }} />
      <div style={{ padding: "28px 48px 20px 48px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid #e2e6ec" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Vantward Solutions" style={{ height: 62, width: "auto", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#162a47", letterSpacing: "1.5px", lineHeight: 1.15, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>VANTWARD SOLUTIONS</div>
            <div style={{ fontSize: 11, color: "#28a868", letterSpacing: "3px", fontWeight: 500, marginTop: 2, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>PTE. LTD.</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#555", lineHeight: 1.7, fontFamily: "'Inter', 'Helvetica Neue', sans-serif", paddingTop: 8 }}>
          <div>68 Circular Road, #02-01</div>
          <div>Singapore 049422</div>
          <div style={{ marginTop: 4 }}><span style={{ color: "#162a47", fontWeight: 600 }}>W</span> +852 9057 6851</div>
          <div><span style={{ color: "#162a47", fontWeight: 600 }}>E</span> director@vantward.com</div>
          <div style={{ marginTop: 4, color: "#999", fontSize: 9 }}>Reg. No. 202606980C</div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ borderTop: "1px solid #e2e6ec", padding: "14px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: "#999", fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        <span>Vantward Solutions Pte. Ltd. | Reg. No. 202606980C</span>
        <span>68 Circular Road, #02-01, Singapore 049422</span>
        <span>director@vantward.com</span>
      </div>
      <div style={{ height: 5, background: "linear-gradient(90deg, #28a868 0%, #28a868 40%, #162a47 40%, #162a47 100%)" }} />
    </div>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={Letterhead} />
        <Route path="/clean" component={LetterheadClean} />
        <Route path="/pitch-akij" component={PitchAkij} />
        <Route path="/kickoff-brief" component={KickoffBrief} />
        <Route path="/enterprise-architecture" component={EnterpriseArchitecture} />
        <Route>
          <div style={{ padding: 40, textAlign: "center" }}>Page not found</div>
        </Route>
      </Switch>
    </WouterRouter>
  );
}

function PitchAkij() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e8e8e8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      <button
        className="no-print"
        onClick={() => window.print()}
        style={{
          marginBottom: 16,
          padding: "10px 28px",
          background: "#162a47",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          cursor: "pointer",
          letterSpacing: "0.5px",
        }}
      >
        Print / Save as PDF
      </button>

      <div
        className="letterhead-page"
        style={{
          width: "210mm",
          minHeight: "297mm",
          background: "#fff",
          boxShadow: "0 2px 16px rgba(0,0,0,0.13)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 6,
            background: "linear-gradient(90deg, #162a47 0%, #162a47 60%, #28a868 60%, #28a868 100%)",
          }}
        />

        <div
          style={{
            padding: "28px 48px 20px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1.5px solid #e2e6ec",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src={`${import.meta.env.BASE_URL}logo.jpg`}
              alt="Vantward Solutions"
              style={{ height: 62, width: "auto", objectFit: "contain" }}
            />
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#162a47",
                  letterSpacing: "1.5px",
                  lineHeight: 1.15,
                  fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
                }}
              >
                VANTWARD SOLUTIONS
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#28a868",
                  letterSpacing: "3px",
                  fontWeight: 500,
                  marginTop: 2,
                  fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
                }}
              >
                PTE. LTD.
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: 10,
              color: "#555",
              lineHeight: 1.7,
              fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              paddingTop: 8,
            }}
          >
            <div>68 Circular Road, #02-01</div>
            <div>Singapore 049422</div>
            <div style={{ marginTop: 4 }}>
              <span style={{ color: "#162a47", fontWeight: 600 }}>W</span>{" "}
              +852 9057 6851
            </div>
            <div>
              <span style={{ color: "#162a47", fontWeight: 600 }}>E</span>{" "}
              director@vantward.com
            </div>
            <div style={{ marginTop: 4, color: "#999", fontSize: 9 }}>
              Reg. No. 202606980C
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: "36px 48px 48px 48px",
            fontSize: 12.5,
            lineHeight: 1.75,
            color: "#222",
          }}
        >
          <div style={{ marginBottom: 24, fontSize: 12, color: "#444" }}>
            10 April 2026
          </div>

          <div style={{ marginBottom: 20, fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>Mr. Sheikh Bashir Uddin</div>
            <div>Managing Director</div>
            <div>Akij Ventures Ltd.</div>
            <div>Akij House, 198 Bir Uttam Mir Shawkat Ali Sarak</div>
            <div>Tejgaon, Dhaka-1208, Bangladesh</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <strong>Subject:</strong> Enterprise AI Firewall &amp; Data Governance — Partnership Proposal
          </div>

          <div style={{ marginBottom: 14 }}>Dear Mr. Uddin,</div>

          <p style={{ marginBottom: 14 }}>
            On behalf of <strong>Vantward Solutions Pte. Ltd.</strong>, I am writing to introduce{" "}
            <strong>EraseAI</strong> — our enterprise-grade AI Firewall and Data Governance platform
            designed to protect organisations adopting large language models and generative AI systems.
          </p>

          <p style={{ marginBottom: 14 }}>
            As Akij Ventures continues to expand its portfolio across manufacturing, FMCG, financial
            services, and technology, the integration of AI-driven decision-making will inevitably
            accelerate. With this acceleration comes significant risk: sensitive corporate data,
            personally identifiable information (PII), and proprietary business intelligence can be
            inadvertently exposed through AI prompts, training data leakage, or model-level
            memorisation.
          </p>

          <p style={{ marginBottom: 14 }}>
            <strong>EraseAI addresses these risks through four core capabilities:</strong>
          </p>

          <div style={{ paddingLeft: 20, marginBottom: 14 }}>
            <p style={{ marginBottom: 8 }}>
              <strong>1. AI Firewall Browser Extension</strong> — A lightweight browser extension
              that integrates with ChatGPT, Google Gemini, Claude, and other major AI platforms,
              scanning every prompt in real time for PII, financial data, trade secrets, and
              API keys before they leave your organisation. Threats are flagged and blocked
              instantly.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>2. API Integration &amp; Auto-Sanitisation</strong> — For internal tools and
              custom AI workflows, EraseAI provides a REST API that intercepts and sanitises
              prompts programmatically. Detected sensitive information is automatically redacted or
              anonymised, ensuring compliance with Bangladesh's Digital Security Act and
              international standards (GDPR, PDPA).
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>3. Dataset Governance &amp; Machine Unlearning</strong> — For organisations
              training proprietary models, EraseAI provides full dataset sanitisation — scanning
              for PII, bias, and toxic content — along with verified machine unlearning, the
              ability to provably remove specific data from trained models upon request.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>4. Real-Time Dashboards &amp; Compliance Reporting</strong> — Centralised
              visibility across all AI interactions with threat analytics, usage tracking, and
              audit-ready compliance reports for internal governance and regulatory submissions.
            </p>
          </div>

          <p style={{ marginBottom: 14 }}>
            For a diversified conglomerate such as Akij Group, the exposure is considerable:
            finance teams handling sensitive transactions, manufacturing divisions managing
            proprietary formulations, and consumer goods units processing customer data — each
            interacting with AI tools daily. EraseAI provides a unified security layer across all
            divisions, with <strong>748+ data points scanned</strong> and real-time threat detection
            across active deployments to date.
          </p>

          <p style={{ marginBottom: 14 }}>
            We propose an <strong>enterprise pilot programme</strong> tailored to Akij Ventures,
            including dedicated onboarding, priority support, and a custom deployment configured
            for your security requirements. This would position your group as a regional leader
            in responsible AI governance — a competitive differentiator as regulatory scrutiny
            increases across South and Southeast Asia.
          </p>

          <p style={{ marginBottom: 14 }}>
            I would welcome the opportunity to arrange a demonstration or introductory meeting at
            your convenience. Please feel free to reach me directly via the contact details above.
          </p>

          <p style={{ marginBottom: 28 }}>
            Thank you for your time and consideration.
          </p>

          <div>
            <div style={{ marginBottom: 4 }}>Yours sincerely,</div>
            <div style={{ marginTop: 28, fontWeight: 600 }}>Firdous Mahmood</div>
            <div style={{ fontSize: 11, color: "#555" }}>Director</div>
            <div style={{ fontSize: 11, color: "#555" }}>
              Vantward Solutions Pte. Ltd.
            </div>
            <div style={{ fontSize: 11, color: "#28a868", marginTop: 2 }}>
              eraseai.ai
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #e2e6ec",
            padding: "14px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 9,
            color: "#999",
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          }}
        >
          <span>Vantward Solutions Pte. Ltd. | Reg. No. 202606980C</span>
          <span>68 Circular Road, #02-01, Singapore 049422</span>
          <span>director@vantward.com</span>
        </div>

        <div
          style={{
            height: 5,
            background: "linear-gradient(90deg, #28a868 0%, #28a868 40%, #162a47 40%, #162a47 100%)",
          }}
        />
      </div>
    </div>
  );
}

function KickoffBrief() {
  const navy = "#162a47";
  const green = "#28a868";

  const SectionTitle = ({ n, children }: { n: string; children: React.ReactNode }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 22,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          background: navy,
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: navy,
          letterSpacing: "0.3px",
          fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          textTransform: "uppercase",
        }}
      >
        {children}
      </div>
    </div>
  );

  const Header = () => (
    <>
      <div
        style={{
          height: 6,
          background: `linear-gradient(90deg, ${navy} 0%, ${navy} 60%, ${green} 60%, ${green} 100%)`,
        }}
      />
      <div
        style={{
          padding: "26px 48px 18px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1.5px solid #e2e6ec",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src={`${import.meta.env.BASE_URL}logo.jpg`}
            alt="Vantward Solutions"
            style={{ height: 56, width: "auto", objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: navy,
                letterSpacing: "1.5px",
                lineHeight: 1.15,
                fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              }}
            >
              VANTWARD SOLUTIONS
            </div>
            <div
              style={{
                fontSize: 10,
                color: green,
                letterSpacing: "3px",
                fontWeight: 500,
                marginTop: 2,
                fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              }}
            >
              PTE. LTD.
            </div>
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 10,
            color: "#555",
            lineHeight: 1.7,
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            paddingTop: 6,
          }}
        >
          <div style={{ color: navy, fontWeight: 600, fontSize: 11 }}>
            EraseAI — Outbound Pilot
          </div>
          <div>Kickoff Brief · Confidential</div>
          <div style={{ marginTop: 4 }}>Prepared 10 July 2026</div>
          <div>For kickoff call: 14 July 2026</div>
        </div>
      </div>
    </>
  );

  const Footer = () => (
    <>
      <div
        style={{
          borderTop: "1px solid #e2e6ec",
          padding: "12px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 9,
          color: "#999",
          fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        }}
      >
        <span>Vantward Solutions Pte. Ltd. | Reg. No. 202606980C</span>
        <span>EraseAI Outbound Pilot — Kickoff Brief</span>
        <span>director@vantward.com</span>
      </div>
      <div
        style={{
          height: 5,
          background: `linear-gradient(90deg, ${green} 0%, ${green} 40%, ${navy} 40%, ${navy} 100%)`,
        }}
      />
    </>
  );

  const bodyText: React.CSSProperties = {
    fontSize: 11.5,
    lineHeight: 1.6,
    color: "#222",
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  };

  const li: React.CSSProperties = { ...bodyText, marginBottom: 5 };

  const pageStyle: React.CSSProperties = {
    width: "210mm",
    minHeight: "297mm",
    background: "#fff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.13)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    marginBottom: 24,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: "24px 48px 32px 48px",
  };

  const pill = (text: string, color: string) => (
    <span
      style={{
        display: "inline-block",
        background: color === navy ? "#eef1f6" : "#e9f6ef",
        color: color,
        fontSize: 9.5,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 20,
        marginRight: 6,
        marginBottom: 6,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      className="brief-root"
      style={{
        minHeight: "100vh",
        background: "#e8e8e8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      }}
    >
      <button
        className="no-print"
        onClick={() => window.print()}
        style={{
          marginBottom: 16,
          padding: "10px 28px",
          background: navy,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          cursor: "pointer",
          letterSpacing: "0.5px",
        }}
      >
        Print / Save as PDF
      </button>

      {/* PAGE 1 */}
      <div className="letterhead-page brief-page" style={pageStyle}>
        <Header />
        <div style={contentStyle}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: navy,
              fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              lineHeight: 1.2,
            }}
          >
            Outbound Pilot — Kickoff Brief
          </div>
          <div style={{ ...bodyText, color: "#666", marginTop: 4, fontSize: 12 }}>
            Positioning, ICP, messaging, and success criteria for the EraseAI cold-outbound pilot with Aprile Dañez.
          </div>

          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "#f6f8fb",
              borderLeft: `3px solid ${navy}`,
              borderRadius: 4,
            }}
          >
            <div style={{ ...bodyText, fontWeight: 700, color: navy, marginBottom: 4 }}>
              Purpose of this pilot
            </div>
            <div style={bodyText}>
              Validate the ICP, messaging, and deliverability for EraseAI in a single US-first
              segment — and generate qualified sales conversations. This is a learning engagement:
              success is a validated, repeatable outbound system plus early qualified meetings, not
              revenue in six weeks. The narrative is owned by EraseAI; execution is owned by Aprile.
            </div>
          </div>

          <SectionTitle n="1">Target ICP — First Segment</SectionTitle>
          <div style={{ ...bodyText, marginBottom: 8 }}>
            We deliberately start narrow. One segment lets us read signal fast before expanding to
            legal, financial, and healthcare later.
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ ...bodyText, fontWeight: 700, color: navy }}>Industry: </span>
            {pill("AI / ML SaaS", green)}
            {pill("Cybersecurity", green)}
            {pill("Data Infrastructure Platforms", green)}
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ ...bodyText, fontWeight: 700, color: navy }}>Company size: </span>
            {pill("20–250 employees", navy)}
            <span style={{ ...bodyText, fontWeight: 700, color: navy, marginLeft: 8 }}>
              Region:{" "}
            </span>
            {pill("United States only", navy)}
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ ...bodyText, fontWeight: 700, color: navy }}>Decision-makers: </span>
            {pill("CISO", green)}
            {pill("CTO", green)}
            {pill("Head of AI / ML", green)}
            {pill("VP Engineering", green)}
            {pill("Founder", green)}
            {pill("DPO / Security Lead", green)}
          </div>
          <div style={{ ...bodyText, color: "#666", fontStyle: "italic", marginTop: 6 }}>
            Why this segment first: they build with AI daily, feel the "shadow AI" pain acutely, and
            have budget owners who already think in terms of data risk — the shortest path to a
            resonant message.
          </div>

          <SectionTitle n="2">Core Positioning</SectionTitle>
          <div
            style={{
              padding: "12px 16px",
              background: navy,
              borderRadius: 6,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.45,
              }}
            >
              EraseAI is the AI Firewall — it stops sensitive data from leaving your organisation
              through AI tools, before it happens, not after.
            </div>
            <div
              style={{
                fontSize: 11,
                color: green,
                marginTop: 6,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
              }}
            >
              Prevention, not forensics. Control at the prompt, not a report next week.
            </div>
          </div>
          <div style={{ ...bodyText }}>
            Three ideas the message must carry to technical buyers:
          </div>
          <ul style={{ paddingLeft: 20, marginTop: 6 }}>
            <li style={li}>
              <strong>Govern the interaction, not the model.</strong> The risk is the moment an
              employee pastes source code, PII, or financial data into a prompt.
            </li>
            <li style={li}>
              <strong>Visibility ≠ control.</strong> A dashboard of last week's leaks is forensics;
              enterprises want the incident to be structurally impossible.
            </li>
            <li style={li}>
              <strong>Trust is defensibility.</strong> Buyers purchase what they can prove to a
              regulator, board, or customer — not benchmark scores.
            </li>
          </ul>
        </div>
        <Footer />
      </div>

      {/* PAGE 2 */}
      <div className="letterhead-page brief-page" style={pageStyle}>
        <Header />
        <div style={contentStyle}>
          <SectionTitle n="3">Messaging Angles to Test</SectionTitle>
          <div style={{ ...bodyText, marginBottom: 10 }}>
            Run 3–4 angles across the sequence so we learn which pain converts. Each gets its own
            subject-line family and follow-up logic.
          </div>

          {[
            {
              tag: "A · Shadow AI",
              title: "\u201CYour team is already pasting company data into ChatGPT.\u201D",
              body:
                "Lead with the uncomfortable truth. Employees use public AI tools daily; source code, customer PII, and secrets leave the building unlogged. EraseAI catches and blocks it at the prompt.",
            },
            {
              tag: "B · Compliance Defensibility",
              title: "\u201CProve to your auditor what data never left.\u201D",
              body:
                "For CISOs / DPOs facing SOC 2, ISO 27001, or customer security reviews. Position EraseAI as audit-ready evidence that AI usage is controlled and logged.",
            },
            {
              tag: "C · Prevention vs. Forensics",
              title: "\u201CDLP tells you what leaked. We stop it before it does.\u201D",
              body:
                "For teams that already have monitoring but no real-time control over the AI layer. Frame the gap between detection and prevention.",
            },
            {
              tag: "D · Dataset Governance / Unlearning",
              title: "\u201CProvably remove data from your trained models.\u201D",
              body:
                "For teams training proprietary models — dataset sanitisation and verified machine unlearning. Narrower, but high-intent when it lands.",
            },
          ].map((a) => (
            <div
              key={a.tag}
              style={{
                border: "1px solid #e2e6ec",
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: green,
                  letterSpacing: "0.5px",
                  fontFamily: "'Inter', sans-serif",
                  marginBottom: 3,
                }}
              >
                {a.tag}
              </div>
              <div style={{ ...bodyText, fontWeight: 700, color: navy, marginBottom: 3 }}>
                {a.title}
              </div>
              <div style={{ ...bodyText, fontSize: 11 }}>{a.body}</div>
            </div>
          ))}

          <SectionTitle n="4">Draft Success Criteria</SectionTitle>
          <div style={{ ...bodyText, marginBottom: 8 }}>
            To finalise together at kickoff. Proposed targets for a 6-week, US-first pilot of
            ~500–900 verified prospects (email + LinkedIn, 3–5 touches):
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              { k: "Inbox deliverability", v: "> 98%", s: "bounce < 2%" },
              { k: "Reply rate", v: "4–8%", s: "of contacted" },
              { k: "Positive replies", v: "1–2%", s: "of contacted" },
              { k: "Qualified meetings", v: "3–6", s: "booked, over the pilot" },
            ].map((m) => (
              <div
                key={m.k}
                style={{
                  flex: "1 1 40%",
                  minWidth: 180,
                  border: "1px solid #e2e6ec",
                  borderRadius: 6,
                  padding: "10px 14px",
                }}
              >
                <div style={{ fontSize: 10.5, color: "#666", fontFamily: "'Inter', sans-serif" }}>
                  {m.k}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: navy, fontFamily: "'Inter', sans-serif" }}>
                  {m.v}
                </div>
                <div style={{ fontSize: 9.5, color: "#999", fontFamily: "'Inter', sans-serif" }}>
                  {m.s}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "10px 14px",
              background: "#f6f8fb",
              borderLeft: `3px solid ${green}`,
              borderRadius: 4,
            }}
          >
            <div style={{ ...bodyText, fontWeight: 700, color: navy, marginBottom: 3 }}>
              A "qualified meeting" =
            </div>
            <div style={{ ...bodyText, fontSize: 11 }}>
              (1) fits the ICP above, (2) attendee is a decision-maker or direct influencer,
              (3) has acknowledged a relevant pain or interest, and (4) attends the scheduled call.
              Lists or replies alone do not count.
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* PAGE 3 */}
      <div className="letterhead-page brief-page" style={pageStyle}>
        <Header />
        <div style={contentStyle}>
          <SectionTitle n="5">Non-Negotiables</SectionTitle>
          <ul style={{ paddingLeft: 20, marginTop: 2 }}>
            <li style={li}>
              <strong>US-only</strong> for the pilot. No UK/CA/AU until consent rules (esp. CASL) are
              cleared — the brand cost of getting this wrong is too high.
            </li>
            <li style={li}>
              <strong>Impeccable sending hygiene:</strong> clean SPF / DKIM / DMARC, clearly
              EraseAI-affiliated domains (not throwaways), instant opt-out. Our outreach must
              demonstrate the standard we sell.
            </li>
            <li style={li}>
              <strong>EraseAI owns the narrative;</strong> Aprile owns list-building, deliverability,
              sequencing, and optimisation.
            </li>
            <li style={li}>
              <strong>Hot replies escalate immediately.</strong> Any high-intent response from a
              CISO / CTO / DPO comes straight to Firdous for a personal, technical reply.
            </li>
          </ul>
        </div>
        <Footer />
      </div>
    </div>
  );
}

function EnterpriseArchitecture() {
  const navy = "#162a47";
  const green = "#28a868";

  const SectionTitle = ({ n, children }: { n: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, marginBottom: 9 }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          background: navy,
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: navy,
          letterSpacing: "0.3px",
          fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          textTransform: "uppercase",
        }}
      >
        {children}
      </div>
    </div>
  );

  const Header = () => (
    <>
      <div
        style={{
          height: 6,
          background: `linear-gradient(90deg, ${navy} 0%, ${navy} 60%, ${green} 60%, ${green} 100%)`,
        }}
      />
      <div
        style={{
          padding: "26px 48px 18px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1.5px solid #e2e6ec",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src={`${import.meta.env.BASE_URL}logo.jpg`}
            alt="Vantward Solutions"
            style={{ height: 56, width: "auto", objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: navy,
                letterSpacing: "1.5px",
                lineHeight: 1.15,
                fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              }}
            >
              VANTWARD SOLUTIONS
            </div>
            <div
              style={{
                fontSize: 10,
                color: green,
                letterSpacing: "3px",
                fontWeight: 500,
                marginTop: 2,
                fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              }}
            >
              PTE. LTD.
            </div>
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 10,
            color: "#555",
            lineHeight: 1.7,
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            paddingTop: 6,
          }}
        >
          <div style={{ color: navy, fontWeight: 600, fontSize: 11 }}>
            EraseAI — Enterprise Deployment
          </div>
          <div>Architecture Brief</div>
          <div style={{ marginTop: 4 }}>Prepared 14 July 2026</div>
        </div>
      </div>
    </>
  );

  const Footer = () => (
    <>
      <div
        style={{
          borderTop: "1px solid #e2e6ec",
          padding: "12px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 9,
          color: "#999",
          fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        }}
      >
        <span>Vantward Solutions Pte. Ltd. | Reg. No. 202606980C</span>
        <span>EraseAI — Enterprise Deployment Architecture</span>
        <span>director@vantward.com</span>
      </div>
      <div
        style={{
          height: 5,
          background: `linear-gradient(90deg, ${green} 0%, ${green} 40%, ${navy} 40%, ${navy} 100%)`,
        }}
      />
    </>
  );

  const bodyText: React.CSSProperties = {
    fontSize: 11.5,
    lineHeight: 1.6,
    color: "#222",
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  };

  const li: React.CSSProperties = { ...bodyText, marginBottom: 5 };

  const pageStyle: React.CSSProperties = {
    width: "210mm",
    minHeight: "297mm",
    background: "#fff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.13)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    marginBottom: 24,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: "22px 48px 28px 48px",
  };

  const diagBox = (title: string, sub: string, bg: string, color: string, border: string): React.ReactNode => (
    <div
      style={{
        flex: 1,
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 8,
        padding: "12px 14px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'Inter', sans-serif" }}>{title}</div>
      <div style={{ fontSize: 9.5, color: "#555", marginTop: 4, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
        {sub}
      </div>
    </div>
  );

  const arrow = (
    <div style={{ display: "flex", alignItems: "center", color: navy, fontSize: 18, fontWeight: 700, padding: "0 6px" }}>
      →
    </div>
  );

  const th: React.CSSProperties = {
    background: navy,
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    padding: "7px 10px",
    textAlign: "left",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.3px",
  };

  const td: React.CSSProperties = {
    fontSize: 10.5,
    lineHeight: 1.55,
    color: "#222",
    padding: "8px 10px",
    borderBottom: "1px solid #e2e6ec",
    verticalAlign: "top",
    fontFamily: "'Inter', sans-serif",
  };

  const tdState: React.CSSProperties = { ...td, fontWeight: 700, color: navy, whiteSpace: "nowrap" };

  return (
    <div
      className="brief-root"
      style={{
        minHeight: "100vh",
        background: "#e8e8e8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      }}
    >
      <button
        className="no-print"
        onClick={() => window.print()}
        style={{
          marginBottom: 16,
          padding: "10px 28px",
          background: navy,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          cursor: "pointer",
          letterSpacing: "0.5px",
        }}
      >
        Print / Save as PDF
      </button>

      {/* PAGE 1 */}
      <div className="letterhead-page brief-page" style={pageStyle}>
        <Header />
        <div style={contentStyle}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: navy,
              marginTop: 8,
              fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            }}
          >
            Enterprise Deployment — Architecture Brief
          </div>
          <div style={{ ...bodyText, color: "#555", marginTop: 4, marginBottom: 14 }}>
            How EraseAI enforces AI data governance across corporate LAN, WiFi/WAN, remote, and
            offline use — on the customer's own infrastructure.
          </div>

          <div
            style={{
              background: "#f4f6fa",
              borderLeft: `4px solid ${green}`,
              padding: "12px 16px",
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: navy, marginBottom: 4 }}>
              Design principle
            </div>
            <div style={{ ...bodyText, fontSize: 11 }}>
              Enforcement travels with the device; the network is the backstop; the policy brain
              lives on the customer's own servers. EraseAI does not depend on the network to
              enforce — the corporate network simply guarantees that the only road to AI tools runs
              through EraseAI.
            </div>
          </div>

          <SectionTitle n="1">Two Enforcement Layers</SectionTitle>
          <ul style={{ paddingLeft: 20, marginTop: 2 }}>
            <li style={li}>
              <strong>Layer 1 — Endpoint (primary control).</strong> The EraseAI browser extension /
              lightweight agent inspects at the prompt — the only point where sensitive data can be
              caught <em>before</em> it leaves. Force-installed via the tools IT already runs
              (Group Policy, Intune, Chrome Enterprise, MDM); identity via corporate SSO, so every
              event is tied to a user.
            </li>
            <li style={li}>
              <strong>Layer 2 — Network (backstop).</strong> The existing switches and egress
              firewall enforce one rule: direct traffic to AI endpoints is blocked unless it comes
              from a device running the EraseAI agent or is routed through the EraseAI gateway.
              Catches unmanaged devices, scripts, and personal laptops on corporate WiFi. DNS
              filtering or an egress proxy rule — no re-cabling.
            </li>
            <li style={li}>
              <strong>Policy server on customer infrastructure.</strong> Rules, audit logs, and the
              admin dashboard run on the customer's own servers (on-prem or private cloud). Prompt
              content never leaves their environment for inspection.
            </li>
          </ul>

          <SectionTitle n="2">Reference Architecture</SectionTitle>
          <div style={{ display: "flex", alignItems: "stretch", marginTop: 4 }}>
            {diagBox(
              "EMPLOYEE DEVICE",
              "EraseAI agent / extension — inspects at the prompt, enforced via MDM + SSO",
              "#eef1f6",
              navy,
              "#c7d0dd"
            )}
            {arrow}
            {diagBox(
              "SWITCHES / EGRESS FIREWALL",
              "LAN + WiFi/WAN — blocks any path to AI tools that bypasses EraseAI",
              "#fff",
              navy,
              "#c7d0dd"
            )}
            {arrow}
            {diagBox(
              "AI TOOLS",
              "ChatGPT, Claude, Copilot, Gemini — reached only through the governed path",
              "#e9f6ef",
              green,
              "#bfe3d0"
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <div
              style={{
                width: "60%",
                background: navy,
                borderRadius: 8,
                padding: "10px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
                ERASEAI POLICY SERVER — ON CUSTOMER SERVERS
              </div>
              <div style={{ fontSize: 9.5, color: "#c9d4e4", marginTop: 3, fontFamily: "'Inter', sans-serif" }}>
                Policy rules · audit log store · admin dashboard · SSO integration
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* PAGE 2 */}
      <div className="letterhead-page brief-page" style={pageStyle}>
        <Header />
        <div style={contentStyle}>
          <SectionTitle n="3">Coverage Across Connectivity States</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
            <thead>
              <tr>
                <th style={th}>Employee state</th>
                <th style={th}>What happens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdState}>On LAN, online</td>
                <td style={td}>
                  Endpoint agent inspects at the prompt; the network blocks anything that bypasses
                  it. Full real-time logging.
                </td>
              </tr>
              <tr>
                <td style={tdState}>On WiFi / WAN, online</td>
                <td style={td}>
                  Identical — WiFi is another path through the same switches and egress point, so
                  both layers apply unchanged.
                </td>
              </tr>
              <tr>
                <td style={tdState}>Remote, online</td>
                <td style={td}>
                  The endpoint agent enforces on its own, independent of network. Policies and
                  audit logs sync with the policy server over the internet or corporate VPN.
                </td>
              </tr>
              <tr>
                <td style={tdState}>Offline</td>
                <td style={td}>
                  Cloud AI tools are unreachable, closing the live leak path. The agent keeps
                  enforcing against local AI models using its cached policy; logs queue and sync on
                  reconnect.
                </td>
              </tr>
            </tbody>
          </table>

          <SectionTitle n="4">Offline Design</SectionTitle>
          <ul style={{ paddingLeft: 20, marginTop: 2 }}>
            <li style={li}>
              <strong>Local policy cache.</strong> The agent evaluates prompts on-device against
              the latest cached policy — no server round-trip for a block/allow decision, and zero
              added latency online.
            </li>
            <li style={li}>
              <strong>Queued audit trail.</strong> Events are stored locally and synced when
              connectivity returns; nothing is lost from the log trail.
            </li>
            <li style={li}>
              <strong>Fail-closed by default.</strong> If the agent cannot reach the policy server
              beyond a configured window, AI tool access is blocked until re-sync. Admins may
              choose fail-open for low-sensitivity groups.
            </li>
          </ul>

          <SectionTitle n="5">Deployment Path</SectionTitle>
          <ul style={{ paddingLeft: 20, marginTop: 2 }}>
            <li style={li}>
              <strong>1. Install the policy server</strong> on customer infrastructure (on-prem or
              private cloud) and connect corporate SSO.
            </li>
            <li style={li}>
              <strong>2. Push the endpoint agent</strong> to managed devices via Group Policy /
              Intune / Chrome Enterprise / MDM.
            </li>
            <li style={li}>
              <strong>3. Add egress rules</strong> at the existing firewall: AI endpoints reachable
              only via EraseAI-governed paths.
            </li>
            <li style={li}>
              <strong>4. Pilot with one department,</strong> tune policies, then roll out
              organisation-wide.
            </li>
          </ul>

          <div
            style={{
              background: navy,
              borderRadius: 8,
              padding: "14px 18px",
              marginTop: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.6 }}>
              "We don't depend on your network to enforce — the control travels with the device.
              Your switches just make sure the only road to AI tools runs through us, and the
              policy brain lives on your own servers."
            </div>
            <div style={{ fontSize: 10, color: green, fontWeight: 600, marginTop: 5 }}>
              EraseAI — prevention at the prompt, on your infrastructure.
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default App;
