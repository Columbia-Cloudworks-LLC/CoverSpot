import Image from "next/image";
import Link from "next/link";
import { COVERSPOT_SUPPORT_MAILTO } from "@/lib/coverspot-support";

const COLUMBIA_CLOUDWORKS_URL = "https://columbiacloudworks.com";

export function Footer() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.1";

  return (
    <footer
      className="border-t border-border bg-background/80 backdrop-blur-sm"
      role="contentinfo"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-5 lg:px-8 md:flex-row md:items-center md:justify-between">
        <a
          href={COLUMBIA_CLOUDWORKS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Image
            src="/columbia-cloudworks-logo.png"
            alt="Columbia Cloudworks"
            width={120}
            height={32}
            className="h-8 w-auto opacity-90"
          />
          <span className="text-meta font-medium text-foreground">
            Columbia Cloudworks
          </span>
        </a>

        <nav
          aria-label="Legal and support"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption"
        >
          <a
            href={COVERSPOT_SUPPORT_MAILTO}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Support
          </a>
          <Link
            href="/terms"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Privacy Policy
          </Link>
          <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-meta text-muted-foreground tabular-nums">
            v{version}
          </span>
        </nav>
      </div>
    </footer>
  );
}
