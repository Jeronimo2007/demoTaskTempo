'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation"; // ✅ CORRECTO


export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return null;
}