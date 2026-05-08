import VerifyEmailClient from "./verify-email-client";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  return <VerifyEmailClient token={params.token ?? ""} />;
}
