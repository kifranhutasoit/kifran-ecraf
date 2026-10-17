import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createColumnHelper, flexRender, tableFeatures, useTable } from "@tanstack/react-table";
import { Lock, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UserRoleModal, type UserRow } from "@/components/UserRoleModal";
import { EmptyState, ErrorState, Notice, PageHeader, SkeletonRows } from "@/components/states";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { USERS_QUERY_KEY } from "@/lib/query-keys";
import { deleteUser, getUsers } from "@/lib/server/users";
import { cn } from "@/lib/utils";

// Administrators only. Non-admins are sent back to the dashboard. The server
// still enforces this for every request.
export const Route = createFileRoute("/_admin/users/")({
	beforeLoad: ({ context }) => {
		if (context.role !== "admin") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: UsersPage,
});

type FlashMessage = { tone: "success" | "error"; text: string };

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, UserRow>();

function UsersPage() {
	const { currentUser } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const usersQuery = useQuery({
		queryKey: USERS_QUERY_KEY,
		queryFn: () => getUsers(),
	});
	const deleteFn = useServerFn(deleteUser);

	const users = (usersQuery.data ?? []) as UserRow[];
	const adminCount = users.filter((u) => u.role === "admin").length;

	const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
	const [notice, setNotice] = useState<FlashMessage | null>(null);

	const deleteMutation = useMutation({
		mutationFn: (userId: string) => deleteFn({ data: { userId } }),
		onSuccess: async () => {
			setDeleteTarget(null);
			setNotice({ tone: "success", text: "User deleted." });
			await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
		},
		onError: (err) => {
			setDeleteTarget(null);
			setNotice({ tone: "error", text: err instanceof Error ? err.message : "Delete failed." });
		},
	});

	/** Why a row's destructive actions are locked, or null if they are allowed. */
	const lockFor = (user: UserRow) => {
		if (user.id === currentUser.id) return "This is your account.";
		if (user.role === "admin" && adminCount <= 1) return "This is the only administrator.";
		return null;
	};

	const columns = columnHelper.columns([
		columnHelper.accessor("name", {
			header: "Name",
			cell: (info) => (
				<div className="flex items-center gap-2">
					<span className="font-semibold text-[var(--sea-ink)]">{info.getValue() || "—"}</span>
					{info.row.original.id === currentUser.id && (
						<span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--sea-ink-soft)] uppercase ring-1 ring-[var(--chip-line)]">
							You
						</span>
					)}
				</div>
			),
		}),
		columnHelper.accessor("email", {
			header: "Email",
			cell: (info) => (
				<span className="break-all text-[var(--sea-ink-soft)]">{info.getValue()}</span>
			),
		}),
		columnHelper.accessor("role", {
			header: "Role",
			cell: (info) => <RoleBadge role={info.getValue()} />,
		}),
		columnHelper.accessor("emailVerified", {
			header: "Verified",
			cell: (info) => (info.getValue() ? "Yes" : "No"),
		}),
		columnHelper.accessor("createdAt", {
			header: "Joined",
			cell: (info) => formatDate(info.getValue()),
		}),
		columnHelper.display({
			id: "actions",
			header: "",
			cell: (info) => {
				const user = info.row.original;
				const lock = lockFor(user);
				return (
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={user.id === currentUser.id}
							title={user.id === currentUser.id ? "You can't change your own role" : undefined}
							onClick={() => setRoleTarget(user)}
						>
							<ShieldCheck className="size-3.5" aria-hidden="true" />
							Role
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-red-600 hover:text-red-700 dark:text-red-400"
							disabled={!!lock}
							title={lock ?? undefined}
							onClick={() => setDeleteTarget(user)}
						>
							<Trash2 className="size-3.5" aria-hidden="true" />
							Delete
						</Button>
					</div>
				);
			},
		}),
	]);

	const table = useTable({
		features,
		columns,
		data: users,
	});

	return (
		<>
			<PageHeader
				kicker="Access"
				title="Users"
				description={`${users.length} ${users.length === 1 ? "account" : "accounts"} · ${adminCount} ${
					adminCount === 1 ? "administrator" : "administrators"
				}. You can't change or remove your own account.`}
			/>

			{notice && (
				<div className="mb-4">
					<Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
						{notice.text}
					</Notice>
				</div>
			)}

			{usersQuery.isPending ? (
				<SkeletonRows rows={4} />
			) : usersQuery.isError ? (
				<ErrorState
					message={`Could not load users. ${(usersQuery.error as Error).message}`}
					onRetry={() => void usersQuery.refetch()}
				/>
			) : users.length === 0 ? (
				<EmptyState title="No users yet" />
			) : (
				<>
					<div className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] md:block">
						<table className="w-full border-collapse text-sm">
							<thead className="bg-[var(--chip-bg)]">
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<th
												key={header.id}
												scope="col"
												className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--sea-ink-soft)] uppercase"
											>
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</th>
										))}
									</tr>
								))}
							</thead>
							<tbody>
								{table.getRowModel().rows.map((row) => (
									<tr
										key={row.id}
										className="border-t border-[var(--line)] transition hover:bg-[var(--link-bg-hover)]"
									>
										{row.getAllCells().map((cell) => (
											<td key={cell.id} className="px-4 py-3 align-middle">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<ul className="grid gap-3 md:hidden">
						{users.map((user) => {
							const lock = lockFor(user);
							return (
								<li key={user.id} className="island-shell rounded-2xl p-4">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="m-0 truncate font-semibold text-[var(--sea-ink)]">
												{user.name || "Unnamed"}
												{user.id === currentUser.id && " (you)"}
											</p>
											<p className="m-0 break-all text-xs text-[var(--sea-ink-soft)]">
												{user.email}
											</p>
										</div>
										<RoleBadge role={user.role} />
									</div>
									<p className="m-0 mt-2 text-xs text-[var(--sea-ink-soft)]">
										Joined {formatDate(user.createdAt)} ·{" "}
										{user.emailVerified ? "Verified" : "Not verified"}
									</p>
									<div className="mt-4 grid grid-cols-2 gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={user.id === currentUser.id}
											onClick={() => setRoleTarget(user)}
										>
											<ShieldCheck className="size-3.5" aria-hidden="true" />
											Change role
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="text-red-600 hover:text-red-700 dark:text-red-400"
											disabled={!!lock}
											onClick={() => setDeleteTarget(user)}
										>
											<Trash2 className="size-3.5" aria-hidden="true" />
											Delete
										</Button>
									</div>
									{lock && (
										<p className="m-0 mt-2 flex items-center gap-1 text-xs text-[var(--sea-ink-soft)]">
											<Lock className="size-3" aria-hidden="true" />
											{lock}
										</p>
									)}
								</li>
							);
						})}
					</ul>
				</>
			)}

			<UserRoleModal
				user={roleTarget}
				actorId={currentUser.id}
				adminCount={adminCount}
				onClose={() => setRoleTarget(null)}
			/>

			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(next) => {
					if (!next) setDeleteTarget(null);
				}}
				title="Delete this user?"
				description={`${deleteTarget?.email ?? ""} will lose access and their sessions will end. This cannot be undone.`}
				confirmLabel="Delete user"
				pending={deleteMutation.isPending}
				onConfirm={() => {
					if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
				}}
			/>
		</>
	);
}

function RoleBadge({ role }: { role: UserRow["role"] }) {
	const isAdmin = role === "admin";
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
				isAdmin
					? "bg-[var(--palm)] text-white"
					: "bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] ring-1 ring-[var(--chip-line)]",
			)}
		>
			{isAdmin ? (
				<ShieldCheck className="size-3" aria-hidden="true" />
			) : (
				<UserRound className="size-3" aria-hidden="true" />
			)}
			{isAdmin ? "Administrator" : "User"}
		</span>
	);
}
