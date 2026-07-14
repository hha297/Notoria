export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[url('/background.png')] bg-cover bg-center bg-no-repeat bg-sidebar">
      {children}
    </div>
  );
}
