import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { seedAdmin } from "@/lib/server/auth";

export const Route = createFileRoute("/setup")({ component: Setup });

function Setup() {
	const seedAdminFn = useServerFn(seedAdmin);
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [message, setMessage] = useState("");

	const handleSeed = async () => {
		setStatus("loading");
		setMessage("");
		try {
			const result = await seedAdminFn();
			setStatus("success");
			setMessage(
				result.alreadySeeded
					? "Admin account already exists. You can sign in."
					: "Admin account seeded. Sign in with admin@example.com / admin12345.",
			);
		} catch (err) {
			setStatus("error");
			setMessage(err instanceof Error ? err.message : "Seed failed");
		}
	};

	return (
		<main className="relative grid min-h-dvh place-items-center px-4 py-10">
			<div className="absolute right-4 top-4">
				<ThemeToggle />
			</div>
			<section className="island-shell rise-in w-full max-w-lg rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Setup</p>
				<h1 className="display-title mb-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
					Seed Admin Account
				</h1>
				<p className="m-0 text-sm leading-7 text-[var(--sea-ink-soft)]">
					Creates the administrator account (password hashed by Better Auth) and a few sample
					products. Data lives in memory only and resets whenever the server restarts.
				</p>

				<div className="mt-6">
					<Button onClick={handleSeed} disabled={status === "loading"}>
						{status === "loading" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
						{status === "loading" ? "Seeding…" : "Seed Admin Account"}
					</Button>

					{status !== "idle" && status !== "loading" && (
						<div
							role={status === "error" ? "alert" : "status"}
							className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4"
						>
							<p
								className={`m-0 text-sm ${
									status === "success"
										? "text-green-700 dark:text-green-400"
										: "text-red-700 dark:text-red-400"
								}`}
							>
								{message}
							</p>
						</div>
					)}

					<p className="mb-0 mt-6 text-sm text-[var(--sea-ink-soft)]">
						Ready?{" "}
						<Link to="/login" className="font-medium underline underline-offset-4">
							Go to sign in
						</Link>
					</p>
				</div>
			</section>
		</main>
	);
}
