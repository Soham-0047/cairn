export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" style={{ minHeight: "100vh", background: "var(--bg-0)", color: "var(--text-hi)" }}>
      {children}
    </div>
  );
}
