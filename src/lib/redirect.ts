/**
 * Only allow same-origin, in-app paths as post-login redirect targets.
 * Blocks open redirects such as `?redirect=https://evil.example`
 * and protocol-relative `//evil.example` tricks.
 */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
	if (typeof value !== "string") return fallback;
	if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
		return fallback;
	}
	if (/[\r\n\t]/.test(value)) return fallback;
	return value;
}
