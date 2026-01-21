import { notFound } from "next/navigation";

export default function E2EPage() {
  if (process.env.E2E !== "1") {
    notFound();
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">E2E OK</h1>
    </main>
  );
}
