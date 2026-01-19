
export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="h-screen overflow-hidden bg-background">
      {children}
    </main>
  );
}
