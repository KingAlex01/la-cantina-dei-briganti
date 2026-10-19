import type { Metadata } from "next";
import LegalFooter from "../LegalFooter";

export const metadata: Metadata = {
  title: "Area staff | La cantina dei briganti",
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return <div lang="it">{children}<LegalFooter /></div>;
}
