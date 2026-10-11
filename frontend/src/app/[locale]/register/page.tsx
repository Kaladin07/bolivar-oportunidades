import { notFound } from "next/navigation";
import { AuthForm } from "@/features/auth/components/auth-form";
import { isLocale } from "@/shared/i18n/i18n";

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ role?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { role } = await searchParams;
  return <AuthForm locale={locale} mode="register" initialRole={role} />;
}
