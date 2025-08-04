export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container mx-auto h-[calc(100vh-4rem)]">
      {children}
    </div>
  )
}
