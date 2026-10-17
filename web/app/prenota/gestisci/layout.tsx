import type { Metadata } from "next";
import { getRequestLanguage } from "../../../lib/i18n/server";
import { manageBookingCopy } from "../../../lib/i18n/manage-booking";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = manageBookingCopy[language];
  return {
    title: `${t.header} | La cantina dei briganti`, description: t.intro,
    robots: { index: false, follow: false },
    alternates: { canonical: "/prenota/gestisci" },
  };
}

export default function ManageBookingLayout({ children }: { children: React.ReactNode }) { return children; }
