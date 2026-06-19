import { Navbar } from "@/components/navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
        {children}
      </main>
    </>
  );
}
