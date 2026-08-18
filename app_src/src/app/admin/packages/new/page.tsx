"use client";
import { AdminShell } from "@/components/admin/AdminShell";
import { PackageForm } from "@/components/admin/PackageForm";

export default function NewPackagePage() {
  return (
    <AdminShell title="Create Package">
      <PackageForm />
    </AdminShell>
  );
}
