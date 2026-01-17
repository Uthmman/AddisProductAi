
export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-muted/30">
      {children}
    </main>
  );
}
