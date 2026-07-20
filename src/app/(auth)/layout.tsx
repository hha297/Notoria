export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background md:bg-[url('/background.png')] md:bg-cover md:bg-center md:bg-no-repeat md:bg-sidebar">
      {children}
    </div>
  );
}
