import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Area staff | La cantina dei briganti",
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return children;
}
