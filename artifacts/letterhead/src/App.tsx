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

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={Letterhead} />
        <Route path="/pitch-akij" component={PitchAkij} />
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

export default App;
