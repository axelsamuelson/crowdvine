import { privatePageMetadata } from "@/lib/seo/private-page-metadata";

export const metadata = {
  ...privatePageMetadata,
  title: "Sign up",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
