/** An Error carrying an HTTP-style status code, used by server functions. */
export type HttpError = Error & { status: number };

export function httpError(status: number, message: string): HttpError {
	return Object.assign(new Error(message), { status });
}
