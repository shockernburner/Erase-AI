import { ArrowLeft, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TermsOfService({ onBack }: { onBack: () => void }) {
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
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("legal.tosTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("legal.effectiveDate")}: April 11, 2026 &mdash; {t("legal.version")} 1.0</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <section>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of EraseAI (&quot;the Platform&quot;), operated by Vantward Solutions Pte. Ltd. (Registration No. 202606980C), a company incorporated in Singapore with its registered address at 68 Circular Road #02-01, Singapore 049422 (&quot;the Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              By accessing or using EraseAI, you agree to be bound by these Terms. If you do not agree, you must not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>&quot;Platform&quot; refers to the EraseAI web application, APIs, browser extensions, and all related services available at eraseai.ai.</li>
              <li>&quot;User&quot;, &quot;you&quot;, or &quot;your&quot; refers to any individual or entity accessing the Platform.</li>
              <li>&quot;Content&quot; means any data, text, datasets, files, or information uploaded to or processed by the Platform.</li>
              <li>&quot;Service&quot; means the AI data governance, machine unlearning, content scanning, and firewall capabilities provided by the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Intellectual Property Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform, including its source code, algorithms, machine learning models, user interface designs, documentation, branding, trademarks, and all associated intellectual property, is the exclusive property of Vantward Solutions Pte. Ltd. All rights not expressly granted herein are reserved.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You acknowledge that the Platform contains proprietary and confidential information protected by applicable intellectual property and other laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree that you shall NOT:</p>
            <div className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-destructive mb-2">3.1 No Reverse Engineering</h3>
                <p className="text-sm text-muted-foreground">Reverse engineer, decompile, disassemble, decode, or otherwise attempt to derive the source code, algorithms, data structures, or underlying ideas of the Platform or any component thereof. This includes but is not limited to analyzing network traffic, API responses, or model outputs to reconstruct proprietary logic.</p>
              </div>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-destructive mb-2">3.2 No Scraping or Cloning</h3>
                <p className="text-sm text-muted-foreground">Use any automated means, including bots, crawlers, scrapers, or similar tools, to access, collect, copy, or extract data, content, or functionality from the Platform. You shall not create a copy, mirror, replica, or derivative of the Platform or any substantial portion thereof.</p>
              </div>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-destructive mb-2">3.3 No API Misuse</h3>
                <p className="text-sm text-muted-foreground">Use the API in any manner that exceeds authorized rate limits, bypasses authentication mechanisms, shares API keys with unauthorized parties, or uses the API for purposes not intended or described in the documentation. Automated bulk access without prior written authorization is strictly prohibited.</p>
              </div>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-destructive mb-2">3.4 No Competitive Replication</h3>
                <p className="text-sm text-muted-foreground">Use the Platform, its features, outputs, documentation, or any information obtained through the Platform to build, develop, train, or assist in the creation of a competing product or service. This includes using EraseAI&apos;s methodologies, workflows, or system architecture as a basis for any similar service.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Unauthorized Access</h2>
            <p className="text-muted-foreground leading-relaxed">
              You shall not attempt to gain unauthorized access to any portion of the Platform, its servers, databases, or connected systems. You shall not probe, scan, or test the vulnerability of the Platform or breach any security or authentication measures. You shall not interfere with or disrupt the integrity or performance of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Account Responsibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for safeguarding your account credentials. You shall not share, transfer, or sell your account or API keys to any third party. You are liable for all activity that occurs under your account. You must immediately notify us of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Data Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Content uploaded to the Platform is processed solely for the purpose of providing the Service. We do not use your Content for training our own models or for any purpose other than delivering the requested analysis, sanitization, or governance functionality. You retain all rights to your Content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, VANTWARD SOLUTIONS PTE. LTD. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Our total aggregate liability shall not exceed the amount paid by you to us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice. Upon termination, your right to use the Platform ceases immediately. Sections relating to intellectual property, limitation of liability, indemnification, and governing law shall survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless Vantward Solutions Pte. Ltd., its directors, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in connection with your use of the Platform, your violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by requiring re-acceptance upon your next login. Your continued use of the Platform after such notification constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Governing Law & Jurisdiction</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Singapore. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Singapore.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section className="border-t border-border/30 pt-6 mt-8">
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
