import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Snowflake',
}

export default function PrivacyPage() {
  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="font-pixel text-xs tracking-[0.25em] text-black/50">SnowFlake</Link>
          <Link href="/" className="text-xs text-black/40 hover:text-black transition-colors">← Back to home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-12 py-20">
        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Privacy Policy</h1>
        <p className="text-sm text-black/40 mb-12">Last updated: January 1, 2025</p>

        <div className="prose prose-sm max-w-none space-y-8 text-sm leading-relaxed text-black/70">
          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, including your name, email address, and payment information when you create an account. We also collect error logs, stack traces, and source code files that you submit through our API for analysis.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services. Error logs and code files are processed by our AI engine to generate fixes and are used solely for the purpose of running investigations you initiate. We do not use your code to train AI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">3. Data Storage</h2>
            <p>Your data is stored on secure cloud infrastructure provided by Supabase and Vercel. We use encryption at rest and in transit. Source code files are temporarily cached during investigation and deleted after processing unless you explicitly request retention.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">4. Third-Party Services</h2>
            <p>We integrate with third-party services including GitHub (for repository access and PR creation), LLM providers (OpenAI, Anthropic, Groq, etc. for code analysis), and Vercel (for hosting). Each third-party service has its own privacy policy governing their use of your data.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">5. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use tracking cookies or share cookie data with third parties for advertising purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">6. Data Retention</h2>
            <p>We retain your account information for as long as your account is active. Investigation results are retained for 90 days. You may request deletion of your data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You can export your investigation history from the dashboard. For data export or deletion requests, contact us at support@snowflakedoitforyou.vercel.app.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">8. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.</p>
          </section>

          <section>
            <h2 className="text-lg font-light text-black/90 mb-3">9. Contact</h2>
            <p>If you have questions about this privacy policy, please contact us at support@snowflakedoitforyou.vercel.app.</p>
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
