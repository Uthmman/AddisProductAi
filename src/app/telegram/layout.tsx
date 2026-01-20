
export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="h-screen flex flex-col bg-background">
      {children}
    </main>
  );
}
