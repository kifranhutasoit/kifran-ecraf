import { Link, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Package } from "lucide-react";
import { type FormEvent, useState } from "react";

import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { getServerSession } from "@/lib/server/auth";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		const { user } = await getServerSession();
		if (user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

type Mode = "signin" | "signup";
type AuthError = { status?: number; code?: string; message?: string };

function describeError(error: AuthError, mode: Mode) {
	if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
	if (error.status && error.status >= 500)
		return "Something went wrong on our side. Please try again.";
	if (mode === "signin") {
		// Pesan sengaja generik supaya tidak membocorkan apakah email terdaftar.
		return "Incorrect email or password.";
	}
	if (error.code?.startsWith("USER_ALREADY_EXISTS"))
		return "An account with this email already exists.";
	return error.message || "Could not create the account.";
}

function LoginPage() {
	const navigate = useNavigate();
	const router = useRouter();
	const [mode, setMode] = useState<Mode>("signin");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);

	const isSignup = mode === "signup";

	function switchMode() {
		setMode(isSignup ? "signin" : "signup");
		setError("");
	}

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (pending) return;
		setError("");

		const trimmedEmail = email.trim();
		if (!trimmedEmail || !password) {
			setError("Enter your email and password.");
			return;
		}
		if (isSignup) {
			if (!name.trim()) {
				setError("Enter your name.");
				return;
			}
			if (password.length < 8) {
				setError("Password must be at least 8 characters.");
				return;
			}
		}

		setPending(true);
		try {
			const result = isSignup
				? await authClient.signUp.email({ name: name.trim(), email: trimmedEmail, password })
				: await authClient.signIn.email({ email: trimmedEmail, password });

			if (result.error) {
				setError(describeError(result.error, mode));
				return;
			}
			await router.invalidate();
			await navigate({ to: "/dashboard" });
		} catch {
			setError("Could not reach the server. Check your connection and try again.");
		} finally {
			setPending(false);
		}
	}

	return (
		<main className="relative grid min-h-dvh place-items-center px-4 py-10">
			<div className="absolute right-4 top-4">
				<ThemeToggle />
			</div>

			<div className="rise-in w-full max-w-md">
				<div className="mb-6 text-center">
					<div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#56c6be,#2f6a4a)] text-white shadow-lg">
						<Package className="size-6" aria-hidden="true" />
					</div>
					<h1 className="display-title m-0 text-3xl font-bold text-[var(--sea-ink)]">
						Ekraf Dashboard
					</h1>
					<p className="mb-0 mt-2 text-sm text-[var(--sea-ink-soft)]">
						{isSignup
							? "Create an account to get started."
							: "Sign in to manage products and users."}
					</p>
				</div>

				<section className="island-shell rounded-2xl p-6 sm:p-8">
					<form onSubmit={onSubmit} noValidate className="space-y-4">
						{error && (
							<div
								role="alert"
								className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
							>
								{error}
							</div>
						)}

						{isSignup && (
							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									autoComplete="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									disabled={pending}
									placeholder="Your name"
								/>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={pending}
								placeholder="you@example.com"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									autoComplete={isSignup ? "new-password" : "current-password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									disabled={pending}
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									aria-label={showPassword ? "Hide password" : "Show password"}
									aria-pressed={showPassword}
									className="absolute inset-y-0 right-0 grid w-10 place-items-center text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
								>
									{showPassword ? (
										<EyeOff className="size-4" aria-hidden="true" />
									) : (
										<Eye className="size-4" aria-hidden="true" />
									)}
								</button>
							</div>
						</div>

						<Button type="submit" disabled={pending} className="w-full">
							{pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							{pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
						</Button>
					</form>

					<p className="mb-0 mt-5 text-center text-sm text-[var(--sea-ink-soft)]">
						{isSignup ? "Already have an account?" : "No account yet?"}{" "}
						<button
							type="button"
							onClick={switchMode}
							className="font-semibold text-[var(--sea-ink)] underline underline-offset-4"
						>
							{isSignup ? "Sign in" : "Create one"}
						</button>
					</p>
				</section>

				<p className="mt-5 text-center text-xs text-[var(--sea-ink-soft)]">
					<Link to="/" className="underline underline-offset-4">
						Back to home
					</Link>
					{" · "}
					<Link to="/setup" className="underline underline-offset-4">
						First-time setup
					</Link>
				</p>
			</div>
		</main>
	);
}
