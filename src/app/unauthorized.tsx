import { ErrorPageFrame } from "@/components/errors/error-page-frame";

export default function UnauthorizedPage() {
  return <ErrorPageFrame kind="unauthorized" withSignInCallback />;
}
