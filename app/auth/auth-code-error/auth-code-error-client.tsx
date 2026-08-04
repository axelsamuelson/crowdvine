"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthCodeErrorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const backHref =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/checkout";

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.signOut({ scope: "local" }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold">
              Inloggningslänken fungerade inte
            </CardTitle>
            <CardDescription>
              Länken kan ha gått ut, redan använts, eller öppnats i en annan
              webbläsare än där du bad om mailet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Gå tillbaka till kassan och begär en ny länk — öppna den i{" "}
                <strong>samma webbläsare</strong> där du fyllde i e-post. Eller
                ange 6-siffrig kod från mailet om den finns.
              </p>
            </div>

            <div className="space-y-2">
              <Button onClick={() => router.push(backHref)} className="w-full">
                Tillbaka till kassan
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/log-in">Till inloggning</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
