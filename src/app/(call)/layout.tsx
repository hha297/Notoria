import type { ReactNode } from "react";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import "./call.css";
import { ProAccessProvider } from "@/components/billing/pro-access-provider";
import { getCurrentProAccess } from "@/lib/auth/pro-access";

export default async function CallLayout({
  children,
}: {
  children: ReactNode;
}) {
  const proAccess = await getCurrentProAccess();

  return (
    <ProAccessProvider hasProAccess={proAccess.hasProAccess}>
      <div className="speaking-call min-h-svh bg-[#150f23] text-white">
        {children}
      </div>
    </ProAccessProvider>
  );
}
