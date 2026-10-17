import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Terminal } from "lucide-react";
import { useState } from "react";

import { Notice, PageHeader, Panel } from "@/components/states";
import { Button } from "@/components/ui/button";
import { seedAdmin } from "@/lib/server/auth";

export const Route = createFileRoute("/_public/setup")({
	component: Setup,
});

type Status = { tone: "success" | "error"; text: string } | null;

function Setup() {
	const seedAdminFn = useServerFn(seedAdmin);
	const [pending, setPending] = useState(false);
	const [status, setStatus] = useState<Status>(null);

	const handleSeed = async () => {
		setPending(true);
		setStatus(null);
		try {
			const result = await seedAdminFn();
			setStatus({
				tone: "success",
				text: result.alreadySeeded
					? "An administrator already exists. You can sign in now."
					: `Administrator ${result.admin} created with sample products. Sign in with the password you set in SEED_ADMIN_PASSWORD.`,
			});
		} catch (err) {
			setStatus({ tone: "error", text: err instanceof Error ? err.message : "Setup failed." });
		} finally {
			setPending(false);
		}
	};

	return (
		<main className="page-wrap px-4 py-12 sm:py-16">
			<div className="mx-auto max-w-2xl">
				<PageHeader
					kicker="Setup"
					title="Create the administrator"
					description="Run this once after deploying. It creates the first administrator and a few sample products. It does nothing if an administrator already exists."
				/>

				<Panel className="grid gap-6">
					<div className="grid gap-2">
						<p className="m-0 flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
							<Terminal className="size-4" aria-hidden="true" />
							Before you run setup
						</p>
						<p className="m-0 text-sm leading-6 text-[var(--sea-ink-soft)]">
							Set <code>SEED_ADMIN_PASSWORD</code> (at least 10 characters) in{" "}
							<code>.env.local</code> and restart the server. The password is never shown on this
							page or stored in source code.
						</p>
					</div>

					{status && (
						<Notice tone={status.tone}>
							<span className="flex items-start gap-2">
								{status.tone === "success" && (
									<CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
								)}
								<span>{status.text}</span>
							</span>
						</Notice>
					)}

					<div className="flex flex-wrap items-center gap-3">
						<Button onClick={handleSeed} disabled={pending}>
							{pending ? "Setting up…" : "Create administrator"}
						</Button>
						<Button asChild variant="ghost">
							<Link to="/login">Go to sign in</Link>
						</Button>
					</div>
				</Panel>
			</div>
		</main>
	);
}
