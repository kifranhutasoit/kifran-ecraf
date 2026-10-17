import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { adapter } from "./db";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
	database: adapter,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8,
		maxPasswordLength: 128,
	},
	session: {
		expiresIn: 60 * 60 * 24, // 1 hari (sebelumnya 7 hari)
		updateAge: 60 * 60 * 2,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},
	// Batasi brute-force: login & sign-up maksimal 5x per menit per IP.
	rateLimit: {
		enabled: true,
		window: 60,
		max: 60,
		customRules: {
			"/sign-in/email": { window: 60, max: 5 },
			"/sign-up/email": { window: 60, max: 5 },
		},
	},
	advanced: {
		useSecureCookies: isProd,
		defaultCookieAttributes: {
			httpOnly: true,
			sameSite: "lax",
			secure: isProd,
		},
	},
	plugins: [tanstackStartCookies()],
});

export default auth;
