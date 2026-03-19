import { LoginButton } from "@/components/auth/login-button";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="landing-hero flex min-h-screen flex-col items-center justify-center gap-(--space-xl) p-6 sm:p-8">
      <div className="landing-hero-text flex flex-col items-center gap-4 text-center">
        <h1 className="font-display text-[2.8rem] sm:text-[3.4rem] leading-[1.05] tracking-[-0.02em]">
          CoverSpot
        </h1>
        <p className="max-w-md text-subheading text-muted-foreground">
          Discover covers, live versions, acoustic renditions, and remixes for
          tracks in your Spotify playlists — then add or swap them with one
          click.
        </p>
      </div>
      <LoginButton errorCode={error} />
      <p className="landing-hero-text text-meta text-muted-foreground text-center">
        Requires a Spotify account. Premium recommended for full playback.
      </p>
    </div>
  );
}
