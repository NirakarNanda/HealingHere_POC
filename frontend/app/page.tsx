import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { Hero } from "@/components/landing/hero";
import { CareAreas } from "@/components/landing/care-areas";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DoctorBanner } from "@/components/landing/doctor-banner";
import { Separator } from "@/components/ui/separator";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 rounded-md" aria-label="Bijayalakshmi Physiotherapy Clinic — home">
          <Image
            src="/logo-emblem.png"
            alt="Bijayalakshmi Physiotherapy Clinic logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-cover shadow-soft ring-1 ring-border"
            priority
          />
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">Bijayalakshmi Physiotherapy Clinic</span>
            <span className="block text-xs text-muted-foreground">Dr. Abhilash Nanda</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1">
        <Hero />
        <CareAreas />
        <HowItWorks />
        <DoctorBanner />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-2.5">
            <Image
              src="/logo-emblem.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-cover ring-1 ring-border"
              aria-hidden
            />
            <span>© {new Date().getFullYear()} Bijayalakshmi Physiotherapy Clinic</span>
          </p>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <p className="text-[13px]">Care by Dr. Abhilash Nanda · Restoring movement, rebuilding confidence</p>
        </div>
      </footer>
    </div>
  );
}
