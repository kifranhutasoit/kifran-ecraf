import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Notice } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { safeRedirectPath } from "#/lib/redirect";
import { getServerSession } from "#/lib/server/auth";

export const Route = createFileRoute("/_public/login")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
		typeof search.redirect === "string" ? { redirect: search.redirect } : {},
	beforeLoad: async ({ search }) => {
		const { session } = await getServerSession();
		if (session) {
			// Already signed in: skip the form. Only in-app paths are allowed.
			throw redirect({ href: safeRedirectPath(search.redirect) });
		}
	},
	component: LoginPage,
});

type Mode = "signin" | "signup";
type FieldName = "name" | "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;

function LoginPage() {
	const { redirect: redirectParam } = Route.useSearch();
	const target = safeRedirectPath(redirectParam);

	const [mode, setMode] = useState<Mode>("signin");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const isSignUp = mode === "signup";

	function validate(): FieldErrors {
		const next: FieldErrors = {};
		if (isSignUp && name.trim().length < 2) next.name = "Enter your name.";
		if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address.";
		if (isSignUp && password.length < MIN_PASSWORD) {
			next.password = `Use at least ${MIN_PASSWORD} characters.`;
		} else if (!isSignUp && password.length === 0) {
			next.password = "Enter your password.";
		}
		return next;
	}

	function switchMode(next: Mode) {
		setMode(next);
		setErrors({});
		setFormError(null);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError(null);
		const found = validate();
		setErrors(found);
		if (Object.keys(found).length > 0) return;

		setPending(true);
		try {
			const result = isSignUp
				? await authClient.signUp.email({ email: email.trim(), password, name: name.trim() })
				: await authClient.signIn.email({ email: email.trim(), password });

			if (result.error) {
				if (result.error.status === 429) {
					setFormError("Too many attempts. Wait a few minutes, then try again.");
				} else if (isSignUp) {
					setFormError(result.error.message || "We could not create that account.");
				} else {
					// Same message for unknown email and wrong password: no account enumeration.
					setFormError("Email or password is incorrect.");
				}
				return;
			}
			window.location.assign(target);
		} catch {
			setFormError("Network error. Check your connection and try again.");
		} finally {
			setPending(false);
		}
	}

	return (
		<main className="flex min-h-[calc(100dvh-9rem)] items-center justify-center px-4 py-12">
			<div className="w-full max-w-md">
				<div className="mb-6 text-center">
					<span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--palm)] text-white shadow-[0_12px_30px_rgba(47,106,74,0.3)]">
						<ShieldCheck className="size-6" aria-hidden="true" />
					</span>
					<h1 className="display-title text-3xl font-bold text-[var(--sea-ink)]">
						{isSignUp ? "Create your account" : "Welcome back"}
					</h1>
					<p className="m-0 mt-2 text-sm text-[var(--sea-ink-soft)]">
						{isSignUp
							? "New accounts can view products. An administrator can grant more access."
							: "Sign in to manage products and users."}
					</p>
				</div>

				<section className="island-shell rounded-2xl p-6 sm:p-8">
					<div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[var(--chip-bg)] p-1">
						{(["signin", "signup"] as const).map((option) => (
							<button
								key={option}
								type="button"
								aria-pressed={mode === option}
								onClick={() => switchMode(option)}
								className={`h-9 rounded-lg text-sm font-semibold transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
									mode === option
										? "bg-[var(--foam)] text-[var(--sea-ink)] shadow-sm"
										: "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
								}`}
							>
								{option === "signin" ? "Sign in" : "Create account"}
							</button>
						))}
					</div>

					<form noValidate onSubmit={handleSubmit} className="grid gap-4">
						{formError && <Notice tone="error">{formError}</Notice>}

						{isSignUp && (
							<Field id="name" label="Name" error={errors.name}>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									autoComplete="name"
									aria-invalid={!!errors.name}
									aria-describedby={errors.name ? "name-error" : undefined}
								/>
							</Field>
						)}

						<Field id="email" label="Email" error={errors.email}>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								autoComplete="email"
								inputMode="email"
								aria-invalid={!!errors.email}
								aria-describedby={errors.email ? "email-error" : undefined}
							/>
						</Field>

						<Field id="password" label="Password" error={errors.password}>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									autoComplete={isSignUp ? "new-password" : "current-password"}
									aria-invalid={!!errors.password}
									aria-describedby={errors.password ? "password-error" : undefined}
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									aria-label={showPassword ? "Hide password" : "Show password"}
									className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									{showPassword ? (
										<EyeOff className="size-4" aria-hidden="true" />
									) : (
										<Eye className="size-4" aria-hidden="true" />
									)}
								</button>
							</div>
						</Field>

						<Button type="submit" disabled={pending} className="mt-2 h-10 w-full">
							{pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
						</Button>
					</form>
				</section>

				<p className="mt-6 text-center text-xs text-[var(--sea-ink-soft)]">
					Need the first administrator?{" "}
					<Link to="/setup" className="font-medium underline underline-offset-4">
						Run setup
					</Link>
				</p>
			</div>
		</main>
	);
}

function Field({
	id,
	label,
	error,
	children,
}: {
	id: string;
	label: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-2">
			<Label htmlFor={id}>{label}</Label>
			{children}
			{error && (
				<p id={`${id}-error`} className="m-0 text-xs text-red-600 dark:text-red-400">
					{error}
				</p>
			)}
		</div>
	);
}
