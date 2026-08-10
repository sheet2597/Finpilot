import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDebounce } from "@/lib/useDebounce";
import { vendorsApi, customersApi } from "../api";
import { PartyCreateModal } from "./PartyCreateModal";





export function PartyListPage({ kind }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebounce(search);
  const client = kind === "vendors" ? vendorsApi : customersApi;

  const { data, isLoading } = useQuery(
    [kind, { page, search: debouncedSearch }],
    () => client.list({ page, page_size: 10, search: debouncedSearch || undefined }).then((r) => r.data),
    { keepPreviousData: true }
  );
  const parties = data?.data || [];
  const pagination = data?.pagination;
  const label = kind === "vendors" ? "Vendor" : "Customer";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{label}s</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage {label.toLowerCase()} details and view their transaction history.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Add {label.toLowerCase()}</Button>
      </div>

      <Card className="!p-0">
        <div className="border-b border-slate-100 p-4 dark:border-ink-800 sm:max-w-xs">
          <SearchInput value={search} onChange={(v) => {setSearch(v);setPage(1);}} placeholder={`Search ${label.toLowerCase()}s`} />
        </div>

        {isLoading ?
        <TableSkeleton cols={4} /> :
        parties.length === 0 ?
        <div className="p-6">
            <EmptyState title={`No ${label.toLowerCase()}s yet`} description={`Add your first ${label.toLowerCase()} to start linking transactions to them.`} action={<Button onClick={() => setCreateOpen(true)}>+ Add {label.toLowerCase()}</Button>} />
          </div> :

        <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-ink-800">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">GST number</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
              {parties.map((party) =>
            <tr key={party.id} className="cursor-pointer hover:bg-surface-muted dark:hover:bg-ink-800" onClick={() => navigate(`/${kind}/${party.id}`)}>
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-slate-100">{party.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{party.gst_number || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{party.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{party.phone || "—"}</td>
                </tr>
            )}
            </tbody>
          </table>
        }

        {pagination && <Pagination page={pagination.page} totalPages={pagination.total_pages} onPageChange={setPage} />}
      </Card>

      <PartyCreateModal open={createOpen} onClose={() => setCreateOpen(false)} kind={kind} label={label} />
    </div>);

}
