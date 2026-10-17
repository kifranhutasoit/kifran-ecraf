import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createColumnHelper, flexRender, tableFeatures, useTable } from "@tanstack/react-table";
import { useState } from "react";

import type { Role } from "@/lib/db";
import { getServerSession } from "@/lib/server/auth";
import { deleteUser, getUsers, updateUserRole } from "@/lib/server/users";

type UserRow = {
	id: string;
	email: string;
	name: string | null;
	role: Role;
	emailVerified: boolean;
	createdAt: string;
};

export const Route = createFileRoute("/users/")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			return redirect({ to: "/demo/better-auth" }) as any;
		}
	},
	component: Users,
});

function Users() {
	const queryClient = useQueryClient();
	const usersQuery = useQuery({
		queryKey: ["users"],
		queryFn: async () => getUsers(),
	});
	const updateRoleFn = useServerFn(updateUserRole);
	const deleteFn = useServerFn(deleteUser);

	const features = tableFeatures({});
	const columnHelper = createColumnHelper<typeof features, UserRow>();

	const columns = columnHelper.columns([
		columnHelper.accessor("name", { header: "Name" }),
		columnHelper.accessor("email", { header: "Email" }),
		columnHelper.accessor("role", {
			header: "Role",
			cell: (info) => {
				const user = info.row.original as UserRow;
				return (
					<RoleSelect
						userId={user.id}
						role={user.role}
						updateRoleFn={updateRoleFn}
						queryClient={queryClient}
					/>
				);
			},
		}),
		columnHelper.accessor("emailVerified", {
			header: "Verified",
			cell: (info) => (info.getValue() ? "Yes" : "No"),
		}),
		columnHelper.accessor("createdAt", {
			header: "Joined",
			cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
		}),
		columnHelper.display({
			id: "actions",
			header: "Actions",
			cell: (info) => {
				const user = info.row.original as UserRow;
				if (user.role === "admin") {
					const adminCount = usersQuery.data?.filter((u) => u.role === "admin").length ?? 0;
					if (adminCount <= 1) {
						return <span className="text-xs text-[var(--sea-ink-soft)]">Last admin</span>;
					}
				}
				return (
					<button
						type="button"
						onClick={() => void handleDelete(user.id)}
						className="text-xs text-red-600 hover:text-red-900 underline underline-offset-4"
					>
						Delete
					</button>
				);
			},
		}),
	]);

	const table = useTable({
		features,
		columns,
		data: usersQuery.data ?? [],
	});

	const handleDelete = async (userId: string) => {
		if (!window.confirm("Delete this user?")) {
			return;
		}
		try {
			await deleteFn({ data: { userId } });
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		} catch (err) {
			window.alert(err instanceof Error ? err.message : "Delete failed");
		}
	};

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div>
						<p className="island-kicker mb-2">Users</p>
						<h1 className="display-title mb-1 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
							Users
						</h1>
						<p className="m-0 text-[var(--sea-ink-soft)]">
							Manage user accounts and roles. Administrator only.
						</p>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm border-collapse">
						<thead>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<th
												key={header.id}
												colSpan={header.colSpan}
												className="px-4 py-3 text-left text-xs font-semibold text-[var(--sea-ink-soft)] bg-[var(--chip-bg)]"
											>
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</th>
										);
									})}
								</tr>
							))}
						</thead>
						<tbody>
							{table.getRowModel().rows.map((row) => {
								return (
									<tr key={row.id} className="border-b border-[var(--line)]">
										{row.getAllCells().map((cell) => {
											return (
												<td key={cell.id} className="px-4 py-3">
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											);
										})}
									</tr>
								);
							})}
							{table.getRowModel().rows.length === 0 && (
								<tr>
									<td
										colSpan={columns.length}
										className="px-4 py-8 text-center text-[var(--sea-ink-soft)]"
									>
										No users yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{usersQuery.isError && (
					<p className="mt-4 text-sm text-red-600">
						Failed to load users: {(usersQuery.error as Error).message}
					</p>
				)}
			</section>
		</main>
	);
}

function RoleSelect({
	userId,
	role,
	updateRoleFn,
	queryClient,
}: {
	userId: string;
	role: Role;
	updateRoleFn: (opts: {
		data: { userId: string; role: Role };
	}) => Promise<unknown>;
	queryClient: ReturnType<typeof useQueryClient>;
}) {
	const [localRole, setLocalRole] = useState<Role>(role);

	const handleChange = async (next: Role) => {
		if (next === localRole) return;
		try {
			await updateRoleFn({ data: { userId, role: next } });
			setLocalRole(next);
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		} catch (err) {
			window.alert(err instanceof Error ? err.message : "Role update failed");
		}
	};

	return (
		<select
			value={localRole}
			onChange={(e) => handleChange(e.target.value as Role)}
			className="text-xs rounded border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-[var(--sea-ink)] focus:outline-none"
		>
			<option value="user">User</option>
			<option value="admin">Administrator</option>
		</select>
	);
}
