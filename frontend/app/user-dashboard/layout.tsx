export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* No header here. The page.tsx handles the specific dashboard header */}
      {children}
    </div>
  )
}