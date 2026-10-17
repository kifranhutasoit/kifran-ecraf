import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";

export function PageHeader({
	kicker,
	title,
	description,
	actions,
}: {
	kicker: string;
	title: string;
	description?: string;
	actions?: React.ReactNode;
}) {
	return (
		<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				<p className="island-kicker mb-2">{kicker}</p>
				<h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
					{title}
				</h1>
				{description && (
					<p className="m-0 mt-1 max-w-2xl text-sm text-[var(--sea-ink-soft)] sm:text-base">
						{description}
					</p>
				)}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
		</div>
	);
}

export function Panel({
	children,
	className = "",
}: { children: React.ReactNode; className?: string }) {
	return (
		<section className={`island-shell rounded-2xl p-4 sm:p-6 ${className}`}>{children}</section>
	);
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
	return (
		<output className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--sea-ink-soft)]">
			<LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
			<span>{label}</span>
		</output>
	);
}

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6", "sk-7", "sk-8"];

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
	return (
		<div className="space-y-3" aria-hidden="true">
			{SKELETON_KEYS.slice(0, rows).map((key) => (
				<div key={key} className="h-12 animate-pulse rounded-xl bg-[var(--chip-bg)]" />
			))}
		</div>
	);
}

export function EmptyState({
	title,
	description,
	action,
}: {
	title: string;
	description?: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--line)] px-6 py-10 text-center">
			<Inbox className="size-8 text-[var(--sea-ink-soft)]" aria-hidden="true" />
			<p className="m-0 font-semibold text-[var(--sea-ink)]">{title}</p>
			{description && (
				<p className="m-0 max-w-sm text-sm text-[var(--sea-ink-soft)]">{description}</p>
			)}
			{action}
		</div>
	);
}

export function ErrorState({
	message,
	onRetry,
}: {
	message: string;
	onRetry?: () => void;
}) {
	return (
		<div
			role="alert"
			className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
		>
			<div className="flex items-start gap-2">
				<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<p className="m-0 text-sm">{message}</p>
			</div>
			{onRetry && (
				<Button variant="outline" size="sm" onClick={onRetry}>
					<RefreshCw className="size-3.5" aria-hidden="true" />
					Try again
				</Button>
			)}
		</div>
	);
}

export function Notice({
	tone,
	children,
	onDismiss,
}: {
	tone: "success" | "error";
	children: React.ReactNode;
	onDismiss?: () => void;
}) {
	const styles =
		tone === "success"
			? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
			: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
	return (
		<div
			role={tone === "error" ? "alert" : "status"}
			className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-sm ${styles}`}
		>
			<div className="min-w-0">{children}</div>
			{onDismiss && (
				<button
					type="button"
					onClick={onDismiss}
					className="shrink-0 text-xs underline underline-offset-4"
				>
					Dismiss
				</button>
			)}
		</div>
	);
}
