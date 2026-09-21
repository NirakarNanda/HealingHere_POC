"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/components/auth/login-form";
import { authApi } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Already authenticated → skip straight to the dashboard.
  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((res) => {
        if (!cancelled && res.authenticated) router.replace("/dashboard");
        else if (!cancelled) setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="inline-flex h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="anim-page-enter w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/logo-emblem.png"
              alt="Bijayalakshmi Physiotherapy Clinic logo"
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl object-cover shadow-lift ring-1 ring-border"
              priority
            />
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
              Bijayalakshmi Physiotherapy Clinic
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Dr. Abhilash Nanda · Doctor sign in</p>
          </div>

          <Card className="shadow-lift">
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Sign in to open the clinic workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              {checking ? (
                <div className="space-y-4" aria-hidden>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <LoginForm />
              )}
            </CardContent>
          </Card>

          <p className="mt-6 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Doctor access only — patient records stay on clinic devices.
          </p>
        </div>
      </main>
    </div>
  );
}
