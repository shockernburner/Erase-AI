import { ArrowLeft, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy({ onBack, onViewTerms }: { onBack: () => void; onViewTerms?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <ShieldX className="w-6 h-6" />
            </div>
            <span className="text-xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              {t("app.name")}
            </span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border/50 text-sm font-medium text-foreground hover:bg-muted/40 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("legal.back")}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("privacy.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("legal.effectiveDate")}: April 11, 2026 &mdash; {t("legal.version")} 1.0</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <section>
            <p className="text-muted-foreground leading-relaxed">
              This Privacy Policy describes how Vantward Solutions Pte. Ltd. (Registration No. 202606980C), located at 68 Circular Road #02-01, Singapore 049422 (&quot;the Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), collects, uses, stores, and protects your personal data when you use the EraseAI platform (&quot;the Platform&quot;) available at eraseai.ai.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We are committed to protecting your privacy and handling your data in an open and transparent manner. This policy is compliant with the Singapore Personal Data Protection Act 2012 (PDPA), the EU General Data Protection Regulation (GDPR), and other applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Data Controller</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vantward Solutions Pte. Ltd. is the data controller responsible for your personal data. For any data protection inquiries, please contact:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li>Email: director@vantward.com</li>
              <li>WhatsApp: +852 9057 6851</li>
              <li>Address: 68 Circular Road #02-01, Singapore 049422</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Data We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following categories of personal data:</p>
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-primary mb-2">2.1 Account Information</h3>
                <p className="text-sm text-muted-foreground">Name, email address, profile image (if provided via Google or GitHub OAuth), and account credentials. This data is necessary to create and manage your account.</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-primary mb-2">2.2 Usage Data</h3>
                <p className="text-sm text-muted-foreground">Information about how you interact with the Platform, including features used, scan requests, API calls, timestamps, and session data. This data helps us improve the Platform and ensure service quality.</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-primary mb-2">2.3 Content Data</h3>
                <p className="text-sm text-muted-foreground">Data, text, datasets, and files you upload to the Platform for processing. Content data is processed solely to deliver the requested service and is not used for model training or any other purpose.</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-primary mb-2">2.4 Billing Information</h3>
                <p className="text-sm text-muted-foreground">Payment-related information processed through our third-party payment provider (Stripe). We do not store full credit card numbers on our servers.</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-primary mb-2">2.5 Technical Data</h3>
                <p className="text-sm text-muted-foreground">IP address, browser type and version, device information, operating system, and referring URLs. This data is collected automatically to ensure platform security and performance.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We process your personal data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Service Delivery:</strong> To provide, operate, and maintain the EraseAI platform and its features, including AI data governance, machine unlearning, content scanning, and firewall capabilities.</li>
              <li><strong className="text-foreground">Account Management:</strong> To create, manage, and authenticate your account, and to communicate with you about your account.</li>
              <li><strong className="text-foreground">Billing &amp; Payments:</strong> To process payments, manage subscriptions, and provide invoices.</li>
              <li><strong className="text-foreground">Security:</strong> To detect, prevent, and respond to security incidents, fraud, and abuse of the Platform.</li>
              <li><strong className="text-foreground">Improvement:</strong> To analyze usage patterns (in aggregate) to improve the Platform&apos;s features, performance, and user experience.</li>
              <li><strong className="text-foreground">Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
              <li><strong className="text-foreground">Communication:</strong> To respond to inquiries, provide support, and send service-related notifications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Legal Basis for Processing (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Under the GDPR, we process your data on the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Contract Performance:</strong> Processing necessary to fulfil our contractual obligations to you (account management, service delivery).</li>
              <li><strong className="text-foreground">Legitimate Interest:</strong> Processing necessary for our legitimate interests, such as platform security, fraud prevention, and service improvement, where these interests are not overridden by your rights.</li>
              <li><strong className="text-foreground">Consent:</strong> Where you have given explicit consent for specific processing activities.</li>
              <li><strong className="text-foreground">Legal Obligation:</strong> Processing necessary to comply with legal requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Data Storage &amp; Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored on secure, encrypted servers. We implement industry-standard technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li>Encryption at rest and in transit (TLS 1.2+)</li>
              <li>Secure session management with HTTP-only cookies</li>
              <li>Password hashing using bcrypt</li>
              <li>Role-based access controls</li>
              <li>Regular security assessments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected, or as required by applicable law. Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li><strong className="text-foreground">Account Data:</strong> Retained for the duration of your account and up to 30 days after account deletion.</li>
              <li><strong className="text-foreground">Content Data:</strong> Processed transiently and deleted promptly after the requested operation is complete. Scan results are retained according to your plan settings.</li>
              <li><strong className="text-foreground">Usage &amp; Analytics Data:</strong> Retained in aggregate form for up to 24 months for service improvement purposes.</li>
              <li><strong className="text-foreground">Billing Records:</strong> Retained for up to 7 years as required by applicable tax and financial regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Cookies &amp; Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies necessary for the operation of the Platform, including session cookies for authentication and security. We do not use third-party advertising cookies or cross-site tracking technologies.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li><strong className="text-foreground">Session Cookies:</strong> Required for authentication and maintaining your login state. These are HTTP-only and secure.</li>
              <li><strong className="text-foreground">Preference Cookies:</strong> Used to remember your language and display preferences.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may share your data with the following categories of third-party service providers, solely to the extent necessary for the operation of the Platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Payment Processing:</strong> Stripe for payment processing. Payment data is handled directly by the payment processor in compliance with PCI-DSS standards.</li>
              <li><strong className="text-foreground">Authentication Providers:</strong> Google and GitHub for OAuth-based login. We receive only the profile information you authorize.</li>
              <li><strong className="text-foreground">Cloud Infrastructure:</strong> Our hosting providers for server infrastructure and database hosting.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell, rent, or trade your personal data to any third party for marketing or advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your jurisdiction, you may have the following rights regarding your personal data:
            </p>
            <div className="space-y-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-emerald-400 mb-2">Under GDPR (EU/EEA Residents)</h3>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">Right of Access:</strong> Request a copy of your personal data.</li>
                  <li><strong className="text-foreground">Right to Rectification:</strong> Request correction of inaccurate data.</li>
                  <li><strong className="text-foreground">Right to Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;).</li>
                  <li><strong className="text-foreground">Right to Restrict Processing:</strong> Request limitation of processing in certain circumstances.</li>
                  <li><strong className="text-foreground">Right to Data Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                  <li><strong className="text-foreground">Right to Object:</strong> Object to processing based on legitimate interests.</li>
                  <li><strong className="text-foreground">Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent.</li>
                </ul>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-emerald-400 mb-2">Under PDPA (Singapore Residents)</h3>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">Access:</strong> Request access to your personal data held by us.</li>
                  <li><strong className="text-foreground">Correction:</strong> Request correction of errors or omissions in your personal data.</li>
                  <li><strong className="text-foreground">Withdrawal of Consent:</strong> Withdraw consent for the collection, use, or disclosure of your personal data.</li>
                  <li><strong className="text-foreground">Data Portability:</strong> Request transfer of your data in a commonly used format.</li>
                </ul>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise any of these rights, please contact us at director@vantward.com. We will respond to your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data may be transferred to and processed in countries outside your country of residence, including Singapore. We ensure that appropriate safeguards are in place for such transfers, including Standard Contractual Clauses (SCCs) where required by the GDPR or equivalent measures under the PDPA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Data Breach Notification</h2>
            <p className="text-muted-foreground leading-relaxed">
              In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify the relevant supervisory authority within 72 hours of becoming aware of the breach, in compliance with GDPR Article 33. Where the breach is likely to result in a high risk to your rights, we will notify affected individuals without undue delay.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Under the PDPA, we will notify the Personal Data Protection Commission (PDPC) of Singapore as required under the applicable notification requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is not intended for use by individuals under the age of 16. We do not knowingly collect personal data from children. If we become aware that a child under 16 has provided us with personal data, we will take steps to delete such data promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">13. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised effective date. Your continued use of the Platform after such changes constitutes your acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section className="border-t border-border/30 pt-6 mt-8">
            {onViewTerms && (
              <button
                onClick={onViewTerms}
                className="text-sm text-primary hover:text-primary/80 font-medium mb-4 block"
              >
                {t("legal.seeAlsoTerms")} &rarr;
              </button>
            )}
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Vantward Solutions Pte. Ltd.</strong><br />
              68 Circular Road #02-01, Singapore 049422<br />
              Registration No. 202606980C<br />
              Email: director@vantward.com | WhatsApp: +852 9057 6851
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
