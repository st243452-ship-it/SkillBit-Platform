export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* The header is now handled inside page.tsx to prevent duplication */}
      {children}
    </div>
  )
}