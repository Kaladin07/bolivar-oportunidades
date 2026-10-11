import { notFound } from "next/navigation";
import { AuthForm } from "@/features/auth/components/auth-form";
import { isLocale } from "@/shared/i18n/i18n";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AuthForm locale={locale} mode="login" />;
}
