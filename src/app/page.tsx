import { LoginButton } from "@/components/auth/login-button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight">CoverSpot</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Discover covers, live versions, acoustic renditions, and remixes for
          tracks in your Spotify playlists — then add or swap them with one
          click.
        </p>
      </div>
      <LoginButton />
      <p className="text-sm text-muted-foreground">
        Requires a Spotify account. Premium recommended for full playback.
      </p>
    </div>
  );
}
