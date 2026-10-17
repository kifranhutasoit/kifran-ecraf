import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import type { Role } from "@/lib/db";
import { getServerSession } from "@/lib/server/auth";
import { deleteUser, getUsers, updateUserRole } from "@/lib/server/users";

type UserRow = { id: string; name?: string | null; email: string; role: Role };

export const Route = createFileRoute("/users/$userId")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	component: UserDetail,
});

function UserDetail() {
	const { userId } = useParams({ from: "/users/$userId" });

	const usersQuery = useQuery({
		queryKey: ["users"],
		queryFn: async () => getUsers(),
	});

	if (usersQuery.isPending) {
		return <main className="page-wrap px-4 py-12">Loading user...</main>;
	}
	if (usersQuery.isError) {
		return (
			<main className="page-wrap px-4 py-12">Error: {(usersQuery.error as Error).message}</main>
		);
	}

	const user = usersQuery.data?.find((u) => u.id === userId);
	if (!user) {
		return <main className="page-wrap px-4 py-12">User not found.</main>;
	}

	return <UserDetailView user={user as UserRow} />;
}

function UserDetailView({ user }: { user: UserRow }) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const updateRoleFn = useServerFn(updateUserRole);
	const deleteFn = useServerFn(deleteUser);
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);

	const handleRoleChange = async (next: Role) => {
		if (next === user.role) return;
		setBusy(true);
		try {
			await updateRoleFn({ data: { userId: user.id, role: next } });
			setMessage("Role updated.");
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		} catch (err) {
			setMessage(err instanceof Error ? err.message : "Role update failed");
		} finally {
			setBusy(false);
		}
	};

	const handleDelete = async () => {
		if (!window.confirm("Delete this user?")) return;
		setBusy(true);
		try {
			await deleteFn({ data: { userId: user.id } });
			await queryClient.invalidateQueries({ queryKey: ["users"] });
			navigate({ to: "/users" });
		} catch (err) {
			setMessage(err instanceof Error ? err.message : "Delete failed");
			setBusy(false);
		}
	};

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<div className="flex items-center gap-3 mb-6">
					<Link to="/users" className="text-xs underline underline-offset-4">
						&larr; Back to users
					</Link>
					<h1 className="display-title text-3xl font-bold sm:text-4xl">User Details</h1>
				</div>

				{message && <p className="mb-5 text-sm">{message}</p>}

				<div className="grid gap-4 sm:grid-cols-3">
					<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">Name</p>
						<p className="m-0 mt-1 text-base font-medium">{user.name ?? "—"}</p>
					</div>
					<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">Email</p>
						<p className="m-0 mt-1 text-base font-medium break-all">{user.email}</p>
					</div>
					<div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-5">
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">Role</p>
						<select
							value={user.role}
							disabled={busy}
							onChange={(e) => handleRoleChange(e.target.value as Role)}
							className="rounded border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 focus:outline-none"
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
						disabled={busy}
						className="bg-red-50 border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 rounded-xl hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 disabled:opacity-50"
					>
						Delete User
					</button>
				</div>
			</section>
		</main>
	);
}
