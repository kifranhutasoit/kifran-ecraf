import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { adapter } from "./db";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
	database: adapter,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 10,
		maxPasswordLength: 128,
	},
	session: {
		// Absolute lifetime of 1 day, refreshed at most once an hour while active.
		expiresIn: 60 * 60 * 24,
		updateAge: 60 * 60,
		// No cookie cache: every request re-checks the session store, so a deleted
		// user or signed-out session stops working immediately.
		cookieCache: { enabled: false },
	},
	rateLimit: {
		enabled: true,
		storage: "memory",
		window: 60,
		max: 100,
		customRules: {
			// Brute-force protection for password sign-in. better-auth counts every
			// attempt (successful ones too), so the limit is set above normal use.
			"/sign-in/email": { window: 15 * 60, max: 10 },
			"/sign-up/email": { window: 60 * 60, max: 10 },
		},
	},
	advanced: {
		defaultCookieAttributes: {
			httpOnly: true,
			sameSite: "lax",
			secure: isProduction,
			path: "/",
		},
	},
	plugins: [tanstackStartCookies()],
});

export default auth;
