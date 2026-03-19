import type { Metadata } from "next";
import Link from "next/link";
import {
  COVERSPOT_SUPPORT_EMAIL,
  COVERSPOT_SUPPORT_MAILTO,
} from "@/lib/coverspot-support";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for CoverSpot, operated by Columbia Cloudworks.",
};

const EFFECTIVE_DATE = "March 19, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 sm:py-12">
        <p className="text-meta text-muted-foreground mb-2">
          <Link
            href="/"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            CoverSpot
          </Link>
        </p>
        <h1 className="font-display text-heading text-foreground mb-2">
          Privacy Policy
        </h1>
        <p className="text-meta text-muted-foreground mb-10">
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div className="space-y-8 text-body text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              1. Who we are
            </h2>
            <p>
              CoverSpot (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is
              operated by Columbia Cloudworks, located in the State of Illinois,
              United States. This Privacy Policy describes how we collect, use,
              disclose, and safeguard information when you use our website and
              application (collectively, the &quot;Service&quot;).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              2. Information we collect
            </h2>
            <p>We may collect the following categories of information:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-foreground">Account and profile data.</strong>{" "}
                When you authenticate with Spotify, we may receive identifiers
                and profile information that Spotify shares with us under your
                authorization (for example, display name, email if permitted by
                Spotify, and Spotify user ID).
              </li>
              <li>
                <strong className="text-foreground">Playlist and music data.</strong>{" "}
                To provide core features, we may process information about your
                playlists and tracks as exposed by Spotify&apos;s API when you
                use the Service, including track metadata needed to discover
                variants and perform actions you request.
              </li>
              <li>
                <strong className="text-foreground">Usage and technical data.</strong>{" "}
                We may collect logs, device or browser type, approximate region
                derived from IP address, and similar diagnostics to operate,
                secure, and improve the Service.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              3. How we use information
            </h2>
            <p>We use information to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide, maintain, and improve the Service;</li>
              <li>Authenticate you and connect to Spotify on your behalf;</li>
              <li>
                Perform actions you initiate (such as updating playlists when
                you choose to add or swap tracks);
              </li>
              <li>Monitor for abuse, fraud, and security incidents;</li>
              <li>Comply with legal obligations and enforce our terms.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              4. Legal bases (where applicable)
            </h2>
            <p>
              If you are in the European Economic Area, the United Kingdom, or
              similar jurisdictions, we process personal data where necessary
              to perform our contract with you, based on our legitimate
              interests (such as security and product improvement, balanced
              against your rights), or where you have given consent, as
              applicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              5. Third-party services
            </h2>
            <p>
              We rely on service providers to operate the Service. For example:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-foreground">Spotify</strong> for
                authentication and music data, subject to Spotify&apos;s privacy
                policy and your account settings with Spotify.
              </li>
              <li>
                <strong className="text-foreground">Supabase</strong> (or
                similar infrastructure) for hosting, database, and
                authentication-related services as configured for the product.
              </li>
              <li>
                Other vendors we use for hosting, analytics, or support, as
                updated from time to time.
              </li>
            </ul>
            <p>
              These providers process data on our instructions and under
              appropriate agreements, but their own policies also apply where
              they act as independent controllers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              6. Retention
            </h2>
            <p>
              We retain information only as long as needed to provide the
              Service, comply with law, resolve disputes, and enforce our
              agreements. Retention periods may depend on the type of data and
              how you use the Service. You may request deletion of your account
              data where applicable; some information may be retained as
              required by law or legitimate business needs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              7. Your rights and choices
            </h2>
            <p>
              Depending on your location, you may have rights to access,
              correct, delete, or export personal data, or to object to or
              restrict certain processing. You may also withdraw consent where
              processing is consent-based. To exercise these rights, email us
              at{" "}
              <a
                href={COVERSPOT_SUPPORT_MAILTO}
                className="text-foreground underline underline-offset-4 hover:no-underline break-all"
              >
                {COVERSPOT_SUPPORT_EMAIL}
              </a>
              . You may also have the right to lodge a complaint with a
              supervisory authority.
            </p>
            <p>
              You can disconnect Spotify or revoke the app&apos;s access through
              your Spotify account settings; some features may no longer work
              after that.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              8. Cookies and similar technologies
            </h2>
            <p>
              We may use cookies, local storage, and similar technologies to
              keep you signed in, remember preferences, and understand how the
              Service is used. You can control cookies through your browser
              settings; blocking certain cookies may affect functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              9. Children&apos;s privacy
            </h2>
            <p>
              The Service is not directed to children under 13 (or the age
              required in your jurisdiction), and we do not knowingly collect
              personal information from children. If you believe we have
              collected such information, please email{" "}
              <a
                href={COVERSPOT_SUPPORT_MAILTO}
                className="text-foreground underline underline-offset-4 hover:no-underline break-all"
              >
                {COVERSPOT_SUPPORT_EMAIL}
              </a>{" "}
              so we can delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              10. International transfers
            </h2>
            <p>
              We may process and store information in the United States and other
              countries where we or our providers operate. Those countries may
              have different data protection laws than your own. Where required,
              we use appropriate safeguards (such as standard contractual
              clauses) for cross-border transfers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              11. Security
            </h2>
            <p>
              We implement technical and organizational measures designed to
              protect your information. No method of transmission or storage is
              completely secure; we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              12. Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will post
              the revised policy on this page and update the effective date.
              Material changes may be communicated through the Service or other
              reasonable means where appropriate.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              13. Contact
            </h2>
            <p>
              For privacy-related questions, requests, and all other CoverSpot
              inquiries, email{" "}
              <a
                href={COVERSPOT_SUPPORT_MAILTO}
                className="text-foreground underline underline-offset-4 hover:no-underline break-all"
              >
                {COVERSPOT_SUPPORT_EMAIL}
              </a>
              . For general information about Columbia Cloudworks, visit{" "}
              <a
                href="https://columbiacloudworks.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:no-underline"
              >
                columbiacloudworks.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
