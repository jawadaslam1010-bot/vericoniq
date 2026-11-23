import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy notice',
  description:
    'How VericonIQ collects, uses, stores and protects personal information, for app users and for people we contact by email.',
}

const LAST_UPDATED = '23 November 2026'
const PRIVACY_EMAIL = 'privacy@vericoniq.com'

const INK = '#1c1917'
const BODY = '#57534e'
const MUTED = '#78716c'
const FAINT = '#a8a29e'
const BORDER = '#e8e4dc'
const TEAL = '#0d9488'

const SERIF = 'var(--font-dm-serif), Georgia, serif'

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-10">
      <h2 className="text-2xl font-normal" style={{ color: INK, fontFamily: SERIF }}>
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed" style={{ color: BODY }}>
        {children}
      </div>
    </section>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 text-base font-semibold" style={{ color: INK }}>
      {children}
    </h3>
  )
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>
}

function MailLink() {
  return (
    <a
      href={`mailto:${PRIVACY_EMAIL}`}
      className="font-medium underline underline-offset-2"
      style={{ color: TEAL }}
    >
      {PRIVACY_EMAIL}
    </a>
  )
}

const CONTENTS = [
  { id: 'who-we-are', label: 'Who we are' },
  { id: 'app', label: 'Using the VericonIQ app' },
  { id: 'outreach', label: 'Business email outreach' },
  { id: 'providers', label: 'Service providers and overseas transfers' },
  { id: 'security', label: 'Security' },
  { id: 'rights', label: 'Your rights and how to use them' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'changes', label: 'Changes to this notice' },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf8', color: INK }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-40"
        style={{ backgroundColor: '#fafaf8', borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: TEAL }}
            >
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg" style={{ color: INK }}>
              VericonIQ
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5"
            style={{ backgroundColor: TEAL, color: 'white' }}
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="max-w-3xl mx-auto px-6 pt-16 pb-2">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: TEAL }}
        >
          Legal
        </span>
        <h1
          className="mt-3 font-normal"
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3rem)',
            lineHeight: 1.12,
            color: INK,
            fontFamily: SERIF,
          }}
        >
          Privacy notice
        </h1>
        <p className="mt-4 text-sm" style={{ color: MUTED }}>
          Last updated: {LAST_UPDATED}
        </p>
        <p className="mt-6 text-lg leading-relaxed" style={{ color: BODY }}>
          This notice explains what personal information VericonIQ collects, why we collect
          it, where it is kept and what you can ask us to do with it. It covers two groups of
          people: those who use the VericonIQ app, and people at organisations we contact by
          email about our service.
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-20">
        {/* Contents */}
        <div
          className="mt-8 rounded-xl p-6"
          style={{ backgroundColor: 'white', border: `1px solid ${BORDER}` }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: FAINT }}
          >
            Contents
          </p>
          <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2" style={{ color: BODY }}>
            {CONTENTS.map((item, i) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="hover:underline underline-offset-2">
                  {i + 1}. {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <Section id="who-we-are" title="1. Who we are">
          <p>
            VericonIQ is a contract performance platform. It reads commercial contracts,
            pulls out the KPIs and obligations in them, and tracks how suppliers perform
            against those targets. In this notice, &ldquo;we&rdquo;, &ldquo;us&rdquo; and
            &ldquo;the VericonIQ team&rdquo; mean the business that runs VericonIQ and the
            website at vericoniq.com.
          </p>
          <p>
            We are based in Australia. We handle personal information in line with the
            Australian Privacy Act 1988 and the Australian Privacy Principles. Where we deal
            with people in the United Kingdom or the European Union, we also apply the UK GDPR
            and the EU GDPR, and for that information we are the controller.
          </p>
          <p>
            For any privacy question or request, email <MailLink />.
          </p>
        </Section>

        <Section id="app" title="2. Using the VericonIQ app">
          <SubHeading>What we collect</SubHeading>
          <List>
            <li>
              <strong style={{ color: INK }}>Account details.</strong> When you sign up we
              ask for your full name, work email, a password and your organisation&rsquo;s
              name. You can also give your ABN. Passwords are handled by our authentication
              provider and stored only in hashed form. We never see them in plain text.
            </li>
            <li>
              <strong style={{ color: INK }}>Team members you invite.</strong> If you invite
              colleagues, we store their name, email address and role so we can send the
              invitation and set up their access.
            </li>
            <li>
              <strong style={{ color: INK }}>Contract and supplier data.</strong> The
              contracts and documents you upload, the terms and KPIs extracted from them,
              supplier records, and performance results entered by your team or your
              suppliers. This can include names and work contact details of people named in
              a contract or recorded as a supplier contact.
            </li>
            <li>
              <strong style={{ color: INK }}>Supplier portal users.</strong> If you ask a
              supplier to submit results through our portal, we store the supplier
              contact&rsquo;s email address and what they submit, including any comments.
            </li>
            <li>
              <strong style={{ color: INK }}>Billing details.</strong> If you take a paid
              plan, payments are processed by Stripe. We receive your plan, billing contact
              and payment status, but not your full card number.
            </li>
            <li>
              <strong style={{ color: INK }}>Activity and security logs.</strong> We keep an
              audit log of key actions in the app (for example, who changed a KPI and when),
              which can include IP address and browser type. This helps us keep accounts
              secure and lets your organisation see who did what.
            </li>
            <li>
              <strong style={{ color: INK }}>Website analytics.</strong> We use Vercel Web
              Analytics to count page views and see which pages are used. It does not use
              cookies and does not identify you personally. The only cookies the app sets
              are the ones needed to keep you signed in.
            </li>
            <li>
              <strong style={{ color: INK }}>Messages to us.</strong> If you email us or join
              our waitlist, we keep what you send, such as your name, email, role and
              message.
            </li>
          </List>

          <SubHeading>Why we use it</SubHeading>
          <List>
            <li>To create and run your account and provide the service you signed up for.</li>
            <li>
              To read your contracts with AI and extract KPIs, obligations, key dates and
              financial terms.
            </li>
            <li>
              To send service emails, such as sign-up confirmation, team invitations,
              supplier portal links, submission notices and renewal reminders. These are sent
              through Resend.
            </li>
            <li>To bill you for paid plans.</li>
            <li>To keep the service secure, fix problems and improve how it works.</li>
            <li>To answer your questions and meet our legal obligations.</li>
          </List>
          <p>
            For UK and EU users, our legal basis is performing our contract with you (or
            your organisation), our legitimate interests in running and securing the
            service, and compliance with legal obligations such as tax record keeping.
          </p>

          <SubHeading>Contract content belongs to you</SubHeading>
          <p>
            The contracts you upload, and any personal information inside them, are your
            organisation&rsquo;s data. We process them only to provide the service to you,
            on your instructions. We do not use your contract content to train AI models,
            and we do not sell it or share it with anyone except the providers listed in
            section 4 who help us run the service.
          </p>
          <p>
            To extract terms, document text is sent to Anthropic&rsquo;s Claude API. Under
            Anthropic&rsquo;s commercial terms, data sent through the API is not used to
            train its models.
          </p>

          <SubHeading>Where it is stored</SubHeading>
          <p>
            Our database and uploaded documents are held with Supabase in its Sydney,
            Australia region. The app itself runs on Vercel, so requests may be processed on
            servers outside Australia. Some of our providers (see section 4) process data in
            the United States.
          </p>

          <SubHeading>How long we keep it</SubHeading>
          <p>
            We keep your account and contract data while your organisation has an active
            account. If you close your account, we delete or de-identify it within 90 days,
            unless we need to keep a record to resolve a dispute or meet a legal duty.
            Billing and tax records are kept for as long as Australian tax law requires.
            Security logs are kept for up to two years.
          </p>
        </Section>

        <Section id="outreach" title="3. Business email outreach">
          <p>
            We contact people at organisations that we think could benefit from VericonIQ,
            such as those responsible for procurement, supplier management or commercial
            contracts. This section explains how that works.
          </p>

          <SubHeading>What we collect and where it comes from</SubHeading>
          <p>
            We use only work contact details that are published for a person&rsquo;s
            professional role, for example on an organisation&rsquo;s website, in a public
            directory or on a public professional profile. We may record:
          </p>
          <List>
            <li>your name, job title or role, and the organisation you work for</li>
            <li>your work email address</li>
            <li>a published work phone number or business address</li>
            <li>a public LinkedIn profile URL</li>
            <li>the web page where we found each detail</li>
          </List>
          <p>
            We do not collect personal email addresses, home addresses or sensitive
            information for outreach.
          </p>

          <SubHeading>Why we use it</SubHeading>
          <p>
            We use these details only to introduce VericonIQ to you as a relevant business
            service, to follow up a small number of times, and to reply if you respond. We
            never sell this data or share it with other businesses for their own marketing.
          </p>
          <p>
            If you are in the UK or EU, our legal basis is legitimate interests: introducing
            a relevant business-to-business service to someone whose role makes it relevant
            to them. We have weighed this against your interests. We contact you only at a
            work address published for your role, keep the number of messages low, and make
            opting out easy.
          </p>

          <SubHeading>How the emails are written</SubHeading>
          <p>
            Our outreach emails are drafted by Nina, VericonIQ&rsquo;s AI assistant. A
            member of the VericonIQ team reviews every reply before it is sent, so if you
            write back, a person reads what you say. No decision with legal or similarly
            significant effects is made about you by automated means.
          </p>

          <SubHeading>Unsubscribing</SubHeading>
          <p>
            Every email includes a one-click unsubscribe link. You can also reply asking us
            to stop, or email <MailLink />. Once you opt out we will not email you again.
          </p>
          <p>
            To make sure of that, we keep your email address on a suppression list. We hold
            it only to stop future emails, and we do not use it for anything else. If we
            deleted it entirely, we would have no way of knowing not to contact you again.
          </p>

          <SubHeading>How long we keep it</SubHeading>
          <p>
            If you do not respond, we delete your outreach record within 12 months of our
            last email. If you become a customer or we are in an ongoing conversation, we
            keep the relevant details for as long as that relationship lasts. Suppression
            list entries are kept for as long as we run outreach.
          </p>
        </Section>

        <Section id="providers" title="4. Service providers and overseas transfers">
          <p>
            We use a small number of providers to run VericonIQ. They handle personal
            information only on our instructions and under their own security and
            confidentiality commitments.
          </p>
          <List>
            <li>
              <strong style={{ color: INK }}>Supabase</strong>: database, file storage and
              sign-in (Sydney, Australia).
            </li>
            <li>
              <strong style={{ color: INK }}>Vercel</strong>: website and app hosting, and
              cookie-free analytics (global, including the United States).
            </li>
            <li>
              <strong style={{ color: INK }}>Anthropic</strong>: AI processing of contract
              text and drafting of outreach emails (United States).
            </li>
            <li>
              <strong style={{ color: INK }}>Resend</strong>: sending service and outreach
              emails (United States).
            </li>
            <li>
              <strong style={{ color: INK }}>Stripe</strong>: payment processing (United
              States and other locations).
            </li>
          </List>
          <p>
            This means your information may be sent outside Australia, the UK or the EU,
            mainly to the United States. Where UK or EU personal information is transferred
            to a country without an adequacy decision, we rely on the safeguards our
            providers offer, such as the EU Standard Contractual Clauses and the UK
            International Data Transfer Addendum. You can ask us for more detail at{' '}
            <MailLink />.
          </p>
          <p>
            We may also disclose information if the law requires it, or to protect our
            rights or the safety of others. We do not sell personal information.
          </p>
        </Section>

        <Section id="security" title="5. Security">
          <p>
            Data is encrypted in transit and at rest. Access inside the app is limited to
            members of your organisation, and each organisation&rsquo;s data is kept
            separate from every other. Access by the VericonIQ team is restricted to what we
            need to run and support the service, and is logged. No system is perfectly
            secure, but if a data breach is likely to cause serious harm, we will tell the
            people affected and the relevant regulator as the law requires.
          </p>
        </Section>

        <Section id="rights" title="6. Your rights and how to use them">
          <p>You can ask us to:</p>
          <List>
            <li>tell you what personal information we hold about you and give you a copy</li>
            <li>correct information that is wrong or out of date</li>
            <li>delete your information</li>
            <li>stop contacting you, or stop using your information for outreach</li>
          </List>
          <p>
            If you are in the UK or EU, you also have the right to object to processing
            based on legitimate interests, to restrict processing, and to receive data you
            gave us in a portable format.
          </p>
          <p>
            To make a request, email <MailLink /> and tell us what you would like us to do.
            We may need to confirm your identity first. We aim to respond within 30 days and
            do not charge for reasonable requests.
          </p>
          <p>
            If you are a user of a customer&rsquo;s VericonIQ account (for example, a team
            member or a supplier contact), some requests about contract data may need to go
            through that organisation, because it controls that data. We will help pass your
            request on.
          </p>
        </Section>

        <Section id="complaints" title="7. Complaints">
          <p>
            If you are unhappy with how we have handled your information, please contact us
            first at <MailLink /> so we can try to fix it. If you are still not satisfied,
            you can complain to:
          </p>
          <List>
            <li>
              in Australia, the Office of the Australian Information Commissioner
              (oaic.gov.au)
            </li>
            <li>in the UK, the Information Commissioner&rsquo;s Office (ico.org.uk)</li>
            <li>in the EU, the data protection authority in the country where you live</li>
          </List>
        </Section>

        <Section id="changes" title="8. Changes to this notice">
          <p>
            We will update this notice when our practices change. The date at the top shows
            when it was last revised. If a change significantly affects how we use your
            information, we will tell account holders by email.
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer className="py-10" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span style={{ color: FAINT }}>
            © {new Date().getFullYear()} VericonIQ · vericoniq.com
          </span>
          <div className="flex items-center gap-6" style={{ color: MUTED }}>
            <Link href="/" className="hover:opacity-70">
              Home
            </Link>
            <Link href="/about" className="hover:opacity-70">
              About
            </Link>
            <a href={`mailto:${PRIVACY_EMAIL}`} className="hover:opacity-70">
              {PRIVACY_EMAIL}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
