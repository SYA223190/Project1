export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ZohoClone</h1>
          <p className="text-slate-500 text-sm mt-1">Business Accounting & Management</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
