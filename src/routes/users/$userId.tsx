import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import type { Role } from "@/lib/db";
import { getServerSession } from "@/lib/server/auth";
import { deleteUser, getUsers, updateUserRole } from "@/lib/server/users";

export const Route = createFileRoute("/users/$userId")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			return redirect({ to: "/demo/better-auth" }) as any;
		}
	},
	component: UserDetail,
});

function UserDetail() {
	const { userId } = useParams({
		from: "/users/$userId",
	});
	const queryClient = useQueryClient();
	const updateRoleFn = useServerFn(updateUserRole);
	const deleteFn = useServerFn(deleteUser);

	const usersQuery = useQuery({
		queryKey: ["users"],
		queryFn: async () => getUsers(),
	});
	const user = usersQuery.data?.find((u) => u.id === userId);

	if (usersQuery.isPending) {
		return (
			<main className="page-wrap px-4 py-12">
				<p className="text-[var(--sea-ink-soft)]">Loading user...</p>
			</main>
		);
	}
	if (!user) {
		return (
			<main className="page-wrap px-4 py-12">
				<p className="text-[var(--sea-ink-soft)]">User not found.</p>
			</main>
		);
	}

	const [localRole, setLocalRole] = useState<Role>(user.role);
	const [message, setMessage] = useState("");

	const handleRoleChange = async (next: Role) => {
		if (next === localRole) return;
		try {
			await updateRoleFn({ data: { userId, role: next } });
			setLocalRole(next);
			setMessage("Role updated.");
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		} catch (err) {
			setMessage(err instanceof Error ? err.message : "Role update failed");
		}
	};

	const handleDelete = async () => {
		if (!window.confirm("Delete this user?")) {
			return;
		}
		try {
			await deleteFn({ data: { userId } });
			window.location.href = "/users";
		} catch (err) {
			setMessage(err instanceof Error ? err.message : "Delete failed");
		}
	};

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="flex items-center gap-3 mb-6">
					<Link
						to="/users"
						className="text-xs text-[var(--sea-ink-soft)] underline underline-offset-4 hover:text-[var(--sea-ink)]"
					>
						&larr; Back to users
					</Link>
					<h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
						User Details
					</h1>
				</div>

				{message && <p className="mb-5 text-sm text-[var(--sea-ink)]">{message}</p>}

				<div className="grid gap-4 sm:grid-cols-3">
					<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">Name</p>
						<p className="m-0 mt-1 text-base font-medium text-[var(--sea-ink)]">
							{user.name ?? "—"}
						</p>
					</div>
					<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">Email</p>
						<p className="m-0 mt-1 text-base font-medium text-[var(--sea-ink)] break-all">
							{user.email}
						</p>
					</div>
					<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">Role</p>
						<select
							value={localRole}
							onChange={(e) => handleRoleChange(e.target.value as Role)}
							className="rounded border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-[var(--sea-ink)] focus:outline-none"
						>
							<option value="user">User</option>
							<option value="admin">Administrator</option>
						</select>
					</div>
				</div>

				<div className="mt-8 flex gap-3">
					<button
						type="button"
						onClick={handleDelete}
						className="bg-red-50 border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 rounded-xl hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-800/30 transition-colors"
					>
						Delete User
					</button>
				</div>
			</section>
		</main>
	);
}
