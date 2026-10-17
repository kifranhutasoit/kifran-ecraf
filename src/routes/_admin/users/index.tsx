import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useState } from "react";

import { UserRoleModal } from "@/components/UserRoleModal";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { deleteUser, getUsers } from "@/lib/server/users";

export const Route = createFileRoute("/_admin/users/")({
	// Hanya admin. Server tetap memeriksa lagi lewat requireAdmin().
	beforeLoad: ({ context }) => {
		if (context.role !== "admin") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: UsersPage,
});

type UserRow = Awaited<ReturnType<typeof getUsers>>[number];

function RoleBadge({ role }: { role: string }) {
	const isAdmin = role === "admin";
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
				isAdmin
					? "border-[var(--sea-ink)] text-[var(--sea-ink)]"
					: "border-[var(--line)] text-[var(--sea-ink-soft)]"
			}`}
		>
			{isAdmin && <ShieldCheck size={12} />}
			{role}
		</span>
	);
}

function UsersPage() {
	const queryClient = useQueryClient();
	const { user: me } = Route.useRouteContext();

	const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
	const [deleting, setDeleting] = useState<UserRow | null>(null);

	const usersQuery = useQuery({
		queryKey: ["users"],
		queryFn: async () => getUsers(),
	});

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ["users"] });
		queryClient.invalidateQueries({ queryKey: ["dashboard"] });
	};

	const deleteMutation = useMutation({
		mutationFn: async (userId: string) => deleteUser({ data: { userId } }),
		onSuccess: () => {
			setDeleting(null);
			refresh();
		},
	});

	const users = usersQuery.data ?? [];

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="mb-6">
					<p className="island-kicker mb-2">Users</p>
					<h1 className="display-title mb-1 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
						Users &amp; roles
					</h1>
					<p className="m-0 text-[var(--sea-ink-soft)]">
						Change roles or remove accounts. The last administrator is always protected.
					</p>
				</div>

				{usersQuery.isPending && (
					<p className="text-sm text-[var(--sea-ink-soft)]">Loading users…</p>
				)}

				{usersQuery.isError && (
					<div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600">
						Failed to load users: {(usersQuery.error as Error).message}
						<div className="mt-2">
							<Button variant="outline" size="sm" onClick={() => usersQuery.refetch()}>
								Try again
							</Button>
						</div>
					</div>
				)}

				{usersQuery.isSuccess && users.length === 0 && (
					<p className="text-sm text-[var(--sea-ink-soft)]">No users found.</p>
				)}

				{users.length > 0 && (
					<>
						{/* Desktop: tabel */}
						<div className="hidden overflow-x-auto md:block">
							<table className="w-full text-left text-sm text-[var(--sea-ink)]">
								<thead>
									<tr className="border-b border-[var(--line)]">
										<th className="py-3 pr-4">Name</th>
										<th className="py-3 pr-4">Email</th>
										<th className="py-3 pr-4">Role</th>
										<th className="py-3 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{users.map((u) => {
										const isMe = u.id === me.id;
										return (
											<tr key={u.id} className="border-b border-[var(--line)]">
												<td className="py-3 pr-4 font-medium">
													{u.name}
													{isMe && (
														<span className="ml-2 text-xs text-[var(--sea-ink-soft)]">(you)</span>
													)}
												</td>
												<td className="py-3 pr-4 text-[var(--sea-ink-soft)]">{u.email}</td>
												<td className="py-3 pr-4">
													<RoleBadge role={u.role} />
												</td>
												<td className="py-3 text-right">
													<div className="inline-flex gap-2">
														<Button variant="outline" size="sm" onClick={() => setRoleTarget(u)}>
															<UserCog size={14} className="mr-1" /> Role
														</Button>
														<Button
															variant="outline"
															size="sm"
															disabled={isMe}
															onClick={() => setDeleting(u)}
														>
															<Trash2 size={14} className="mr-1" /> Delete
														</Button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{/* Mobile: kartu */}
						<div className="grid gap-3 md:hidden">
							{users.map((u) => {
								const isMe = u.id === me.id;
								return (
									<div
										key={u.id}
										className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4"
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<p className="m-0 font-semibold text-[var(--sea-ink)]">
													{u.name}
													{isMe && (
														<span className="ml-2 text-xs text-[var(--sea-ink-soft)]">(you)</span>
													)}
												</p>
												<p className="m-0 truncate text-sm text-[var(--sea-ink-soft)]">{u.email}</p>
											</div>
											<RoleBadge role={u.role} />
										</div>
										<div className="mt-3 flex gap-2">
											<Button variant="outline" size="sm" onClick={() => setRoleTarget(u)}>
												<UserCog size={14} className="mr-1" /> Role
											</Button>
											<Button
												variant="outline"
												size="sm"
												disabled={isMe}
												onClick={() => setDeleting(u)}
											>
												<Trash2 size={14} className="mr-1" /> Delete
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</>
				)}
			</section>

			{/* Modal ubah role. Modal menangani invalidate ["users"] sendiri. */}
			{roleTarget && (
				<UserRoleModal
					key={roleTarget.id}
					user={roleTarget}
					currentUserId={me.id}
					onClose={() => {
						setRoleTarget(null);
						queryClient.invalidateQueries({ queryKey: ["dashboard"] });
					}}
				/>
			)}

			{/* Konfirmasi hapus */}
			<Dialog
				open={deleting !== null}
				onOpenChange={(open) => {
					if (!open && !deleteMutation.isPending) {
						setDeleting(null);
						deleteMutation.reset();
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete user?</DialogTitle>
						<DialogDescription>
							{deleting?.email} will lose access immediately and all of their sessions are revoked.
						</DialogDescription>
					</DialogHeader>
					{deleteMutation.isError && (
						<p className="text-sm text-red-600">{(deleteMutation.error as Error).message}</p>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							disabled={deleteMutation.isPending}
							onClick={() => setDeleting(null)}
						>
							Cancel
						</Button>
						<Button
							disabled={deleteMutation.isPending}
							onClick={() => deleting && deleteMutation.mutate(deleting.id)}
						>
							{deleteMutation.isPending ? "Deleting…" : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</main>
	);
}
