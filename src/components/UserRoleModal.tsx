import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/db";
import { USERS_QUERY_KEY } from "@/lib/query-keys";
import { updateUserRole } from "@/lib/server/users";

import { Notice } from "./states";

export type UserRow = {
	id: string;
	email: string;
	name: string | null;
	role: Role;
	emailVerified: boolean;
	createdAt: string;
};

export function UserRoleModal({
	user,
	actorId,
	adminCount,
	onClose,
}: {
	user: UserRow | null;
	actorId: string;
	adminCount: number;
	onClose: () => void;
}) {
	return (
		<Dialog open={!!user} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="max-w-md">
				{user && (
					<RoleForm
						key={user.id}
						user={user}
						actorId={actorId}
						adminCount={adminCount}
						onDone={onClose}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function RoleForm({
	user,
	actorId,
	adminCount,
	onDone,
}: {
	user: UserRow;
	actorId: string;
	adminCount: number;
	onDone: () => void;
}) {
	const queryClient = useQueryClient();
	const updateFn = useServerFn(updateUserRole);
	const [role, setRole] = useState<Role>(user.role);
	const [error, setError] = useState<string | null>(null);

	const isSelf = user.id === actorId;
	const isOnlyAdmin = user.role === "admin" && adminCount <= 1;
	const lockReason = isSelf
		? "You can't change your own role. Ask another administrator."
		: isOnlyAdmin
			? "This is the only administrator. Promote another user first."
			: null;
	const changed = role !== user.role;

	const mutation = useMutation({
		mutationFn: (next: Role) => updateFn({ data: { userId: user.id, role: next } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
			onDone();
		},
		onError: (err) => {
			setError(err instanceof Error ? err.message : "Role update failed.");
		},
	});

	return (
		<>
			<DialogHeader>
				<DialogTitle>Change role</DialogTitle>
				<DialogDescription>
					{user.name ? `${user.name} · ` : ""}
					{user.email}
				</DialogDescription>
			</DialogHeader>

			{error && <Notice tone="error">{error}</Notice>}

			<form
				className="grid gap-5"
				onSubmit={(e) => {
					e.preventDefault();
					if (!changed || lockReason) return;
					setError(null);
					mutation.mutate(role);
				}}
			>
				<div className="grid gap-2">
					<Label htmlFor="user-role">Role</Label>
					<select
						id="user-role"
						value={role}
						disabled={!!lockReason || mutation.isPending}
						onChange={(e) => setRole(e.target.value as Role)}
						className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--chip-bg)] px-3 text-sm text-[var(--sea-ink)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						<option value="user">User: can view products</option>
						<option value="admin">Administrator: full access</option>
					</select>
					{lockReason ? (
						<p className="m-0 text-xs text-[var(--sea-ink-soft)]">{lockReason}</p>
					) : (
						<p className="m-0 text-xs text-[var(--sea-ink-soft)]">
							Administrators can manage products and users. Users can only view products.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={!changed || !!lockReason || mutation.isPending}>
						{mutation.isPending && (
							<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
						)}
						{mutation.isPending ? "Saving…" : "Save role"}
					</Button>
				</DialogFooter>
			</form>
		</>
	);
}
