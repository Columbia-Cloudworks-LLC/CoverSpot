import type { Metadata } from "next";
import Link from "next/link";
import {
  COVERSPOT_SUPPORT_EMAIL,
  COVERSPOT_SUPPORT_MAILTO,
} from "@/lib/coverspot-support";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for CoverSpot, operated by Columbia Cloudworks.",
};

const EFFECTIVE_DATE = "March 19, 2026";

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p className="text-meta text-muted-foreground mb-10">
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div className="space-y-8 text-body text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              1. Acceptance of terms
            </h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of CoverSpot (the &quot;Service&quot;), a web application
              operated by Columbia Cloudworks, located in the State of Illinois
              (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing
              or using the Service, you agree
              to be bound by these Terms. If you do not agree, do not use the
              Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              2. Description of the Service
            </h2>
            <p>
              CoverSpot helps you explore alternate versions of music tracks
              (such as covers, live performances, acoustic versions, or remixes)
              that may be available through third-party platforms, and may assist
              you in managing related actions with your connected music
              services. The Service is provided for personal, non-commercial use
              unless we agree otherwise in writing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              3. Third-party accounts and Spotify
            </h2>
            <p>
              The Service may require you to sign in or connect a Spotify
              account. Your use of Spotify is subject to Spotify&apos;s own
              terms, policies, and requirements, including any subscription or
              premium rules that apply to playback or API access. We are not
              responsible for Spotify&apos;s services, availability, or
              changes to their platform. You are responsible for maintaining the
              security of your accounts and for all activity that occurs under
              them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              4. Your responsibilities
            </h2>
            <p>You agree that you will not:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Use the Service in violation of applicable law or third-party
                rights.
              </li>
              <li>
                Attempt to gain unauthorized access to the Service, other
                users&apos; data, or our systems.
              </li>
              <li>
                Reverse engineer, scrape, or overload the Service except as
                permitted by law.
              </li>
              <li>
                Use the Service to distribute malware, spam, or harmful
                content.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              5. Intellectual property
            </h2>
            <p>
              The Service, including its software, branding, and documentation,
              is owned by Columbia Cloudworks and its licensors and is
              protected by intellectual property laws. Music, artwork, and other
              content made available through third-party APIs remain the
              property of their respective owners. These Terms do not grant you
              any rights to such third-party content beyond what those platforms
              allow.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              6. Disclaimers
            </h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
              IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
              FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
              WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
              THAT RESULTS (INCLUDING DISCOVERED TRACKS OR VARIANTS) WILL BE
              ACCURATE OR COMPLETE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              7. Limitation of liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, COLUMBIA CLOUDWORKS AND ITS
              AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER
              INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF THE
              SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR
              RELATING TO THE SERVICE OR THESE TERMS IS LIMITED TO THE GREATER
              OF (A) THE AMOUNT YOU PAID US FOR THE SERVICE IN THE TWELVE (12)
              MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (US$100),
              IF YOU HAVE NOT PAID US. SOME JURISDICTIONS DO NOT ALLOW CERTAIN
              LIMITATIONS; IN THOSE CASES, OUR LIABILITY WILL BE LIMITED TO THE
              FULLEST EXTENT PERMITTED BY LAW.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              8. Indemnity
            </h2>
            <p>
              You will defend, indemnify, and hold harmless Columbia Cloudworks
              and its affiliates from and against any claims, damages,
              obligations, losses, liabilities, costs, or debt, and expenses
              (including reasonable attorneys&apos; fees) arising from your use
              of the Service or violation of these Terms, to the extent permitted
              by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              9. Suspension and termination
            </h2>
            <p>
              We may suspend or terminate your access to the Service at any time,
              with or without notice, for conduct that we believe violates these
              Terms or harms the Service, users, or third parties. Provisions
              that by their nature should survive termination (including
              intellectual property, disclaimers, limitation of liability, and
              governing law) will survive.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              10. Governing law
            </h2>
            <p>
              These Terms are governed by the laws of the United States and the
              State of Illinois, without regard to conflict-of-law principles,
              except where preempted by applicable law. You agree that the state
              and federal courts located in Illinois will have exclusive
              jurisdiction for disputes relating to these Terms or the Service,
              and you consent to personal jurisdiction there.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              11. Changes to these Terms
            </h2>
            <p>
              We may modify these Terms from time to time. We will post the
              updated Terms on this page and update the effective date. Your
              continued use of the Service after changes become effective
              constitutes acceptance of the revised Terms. If you do not agree,
              you must stop using the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-subheading font-semibold text-foreground">
              12. Contact
            </h2>
            <p>
              For all inquiries regarding CoverSpot, including questions about
              these Terms, email{" "}
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
