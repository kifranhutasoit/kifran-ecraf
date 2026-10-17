import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { updateUserRole } from "@/lib/server/users";

export type RoleModalUser = { id: string; name: string | null; email: string; role: Role };

export function UserRoleModal({
	user,
	currentUserId,
	onClose,
}: {
	user: RoleModalUser;
	currentUserId: string | undefined;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const updateFn = useServerFn(updateUserRole);
	const [role, setRole] = useState<Role>(user.role);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");

	const isSelf = user.id === currentUserId;
	const unchanged = role === user.role;

	async function save() {
		setPending(true);
		setError("");
		try {
			await updateFn({ data: { userId: user.id, role } });
			await queryClient.invalidateQueries({ queryKey: ["users"] });
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Role update failed");
			setPending(false);
		}
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !pending) onClose();
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Change role</DialogTitle>
					<DialogDescription>
						{user.name || user.email} ({user.email})
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div
						role="alert"
						className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
					>
						{error}
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="role-select">Role</Label>
					<select
						id="role-select"
						value={role}
						onChange={(e) => setRole(e.target.value as Role)}
						disabled={pending}
						className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
					>
						<option value="user">User</option>
						<option value="admin">Administrator</option>
					</select>
					{isSelf && (
						<p className="text-xs text-muted-foreground">
							You cannot remove your own admin role. Ask another administrator to do it.
						</p>
					)}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" disabled={pending} onClick={onClose}>
						Cancel
					</Button>
					<Button disabled={pending || unchanged || (isSelf && role !== "admin")} onClick={save}>
						{pending ? "Saving…" : "Save role"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
