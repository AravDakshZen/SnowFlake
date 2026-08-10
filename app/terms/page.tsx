import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Snowflake',
}

export default function TermsPage() {
  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="font-pixel text-xs tracking-[0.25em] text-black/50">SnowFlake</Link>
          <Link href="/" className="text-xs text-black/40 hover:text-black transition-colors">← Back to home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-12 py-20">
        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Terms of Service</h1>
        <p className="text-sm text-black/40 mb-12">Last updated: January 1, 2025</p>

        <div className="prose prose-sm max-w-none space-y-8 text-sm leading-relaxed text-black/70">
          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Snowflake, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">2. Description of Service</h2>
            <p>Snowflake is an AI-powered error detection and automatic fix platform. It analyzes error logs submitted through our API, generates fixes using large language models, and creates pull requests on your GitHub repository. The service requires a third-party LLM API key and GitHub integration to function.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">3. User Accounts</h2>
            <p>You must create an account to use Snowflake. You are responsible for maintaining the confidentiality of your credentials and API keys. You are responsible for all activities that occur under your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">4. Acceptable Use</h2>
            <p>You agree not to: (a) use the service for any unlawful purpose; (b) submit malicious code or files designed to exploit the service; (c) attempt to reverse-engineer the AI models; (d) share your API keys with unauthorized parties; (e) use the service to generate code that violates third-party intellectual property rights.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">5. Intellectual Property</h2>
            <p>You retain ownership of all code you submit. Snowflake does not claim ownership over generated fixes. You grant Snowflake a limited license to process your code for the purpose of running investigations you initiate.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">6. Service Availability</h2>
            <p>We strive to maintain high availability but do not guarantee uninterrupted service. We are not liable for any downtime, data loss, or delays in error detection or fix generation.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">7. Limitation of Liability</h2>
            <p>Snowflake is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from the use of our service, including but not limited to lost profits, data loss, or business interruption. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">8. Termination</h2>
            <p>We may terminate or suspend your account at any time for violation of these terms. You may terminate your account at any time from the dashboard settings. Upon termination, your data will be deleted in accordance with our privacy policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">9. Governing Law</h2>
            <p>These terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">10. Contact</h2>
            <p>If you have questions about these terms, please contact us at support@snowflakedoitforyou.vercel.app.</p>
          </section>
        </div>
      </main>

      <footer className="py-10 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <span className="font-pixel text-xs tracking-[0.25em] text-black/50">SnowFlake</span>
            <p className="mt-2 text-xs text-black/25">Understand what happened. Fix what matters.</p>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Docs", href: "/docs" },
              { label: "GitHub", href: "https://github.com/AravDakshZen" },
            ].map(l => (
              <a key={l.label} href={l.href} className="text-xs text-black/25 hover:text-black/55 transition-colors tracking-widest">{l.label}</a>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-black/[0.04]">
          <span className="text-xs text-black/20">© 2025 Snowflake. Error detection & automatic fixes.</span>
        </div>
      </footer>
    </div>
  )
}
