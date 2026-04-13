import Sidebar from "@/components/Sidebar"; // আপনার সাইডবারের সঠিক পাথ দিন

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar /> {/* সাইডবার শুধু অ্যাডমিন পেজেই দেখাবে */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}