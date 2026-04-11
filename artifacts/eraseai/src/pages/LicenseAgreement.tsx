import { ArrowLeft, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LicenseAgreement({ onBack }: { onBack: () => void }) {
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
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("legal.licenseTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("legal.effectiveDate")}: April 11, 2026 &mdash; {t("legal.version")} 1.0</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <section>
            <p className="text-muted-foreground leading-relaxed">
              This End-User License Agreement (&quot;EULA&quot; or &quot;License Agreement&quot;) is a legal agreement between you (&quot;Licensee&quot;, &quot;you&quot;, or &quot;your&quot;) and Vantward Solutions Pte. Ltd. (Registration No. 202606980C), 68 Circular Road #02-01, Singapore 049422 (&quot;Licensor&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), governing your use of the EraseAI platform and associated software (&quot;Software&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. License Grant</h2>
            <p className="text-muted-foreground leading-relaxed">
              Subject to the terms and conditions of this Agreement and your compliance with all applicable Terms of Service, we grant you a <strong className="text-foreground">limited, non-exclusive, non-transferable, non-sublicensable, revocable</strong> license to access and use the Software solely for your internal business or personal purposes, in accordance with the subscription plan you have purchased or the free tier terms.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              This license does not grant you any ownership rights in the Software. All rights not expressly granted are reserved by the Licensor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Restrictions on Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Under this License, you shall NOT:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Copy, modify, adapt, translate, or create derivative works based upon the Software;</li>
              <li>Sublicense, lease, rent, loan, sell, distribute, or otherwise transfer the Software or access thereto to any third party;</li>
              <li>Reverse engineer, disassemble, decompile, or otherwise attempt to discover the source code or underlying algorithms of the Software;</li>
              <li>Remove, alter, or obscure any proprietary notices, labels, or marks on the Software;</li>
              <li>Use the Software for any unlawful purpose or in violation of any applicable laws or regulations;</li>
              <li>Use the Software to develop, directly or indirectly, any product or service that competes with EraseAI;</li>
              <li>Use automated tools to systematically extract data, features, or functionality from the Software;</li>
              <li>Circumvent, disable, or otherwise interfere with any security or access control features of the Software;</li>
              <li>Share API credentials, access tokens, or login credentials with unauthorized persons or entities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Proprietary Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Software, including all copies, modifications, and derivative works thereof, is and shall remain the sole and exclusive property of Vantward Solutions Pte. Ltd. The Software is protected by copyright laws, international treaty provisions, and other intellectual property laws and treaties.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              All trademarks, service marks, trade names, logos, and other identifiers of source (&quot;Marks&quot;) displayed on or in connection with the Software are the property of Vantward Solutions Pte. Ltd. You are not granted any right or license to use any Marks without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Confidentiality</h2>
            <p className="text-muted-foreground leading-relaxed">
              You acknowledge that the Software contains trade secrets and confidential information of the Licensor, including but not limited to: source code, algorithms, data models, system architecture, business logic, pricing structures, and technical documentation.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You agree to maintain the confidentiality of such information and not to disclose it to any third party without the Licensor&apos;s prior written consent. This obligation survives the termination of this Agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain all ownership rights in data you submit to the Software (&quot;Your Data&quot;). You grant us a limited license to process Your Data solely for the purpose of providing the Service. We will not sell, share, or use Your Data for any purpose other than delivering the functionality you requested.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless Vantward Solutions Pte. Ltd. and its officers, directors, employees, agents, and successors from any claims, demands, losses, damages, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li>Your use or misuse of the Software;</li>
              <li>Your breach of this Agreement or the Terms of Service;</li>
              <li>Your violation of any applicable law, rule, or regulation;</li>
              <li>Any claim that Your Data infringes the intellectual property rights of any third party.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              IN NO EVENT SHALL VANTWARD SOLUTIONS PTE. LTD. BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, REGARDLESS OF THE CAUSE OF ACTION OR THE THEORY OF LIABILITY, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR MAXIMUM AGGREGATE LIABILITY SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Term and Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              This License is effective until terminated. We may terminate this License at any time if you breach any provision of this Agreement. Upon termination, you must immediately cease all use of the Software and destroy all copies in your possession. Sections 2, 3, 4, 6, 7, 8, and 10 shall survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              This Agreement shall be governed by and construed in accordance with the laws of the Republic of Singapore, without regard to its conflict of law provisions. You consent to the exclusive jurisdiction and venue of the courts located in Singapore for all disputes arising under this Agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Entire Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              This License Agreement, together with the Terms of Service, constitutes the entire agreement between you and Vantward Solutions Pte. Ltd. with respect to the Software and supersedes all prior or contemporaneous communications, whether written or oral.
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
