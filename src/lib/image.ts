export const MAX_IMAGE_SIDE = 512;
export const MAX_IMAGE_BYTES = 300 * 1024;
// base64 membengkak ~4/3, ditambah prefix "data:image/jpeg;base64,"
export const MAX_IMAGE_FIELD_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 64;
const MAX_URL_LENGTH = 2048;

type ImageInfo = {
	mime: "image/png" | "image/jpeg" | "image/webp";
	width: number;
	height: number;
};

function ascii(buf: Uint8Array, start: number, end: number) {
	return String.fromCharCode(...buf.subarray(start, end));
}

/** Baca mime + dimensi dari byte asli gambar. Return null kalau bukan PNG/JPEG/WebP valid. */
export function readImageInfo(buf: Uint8Array): ImageInfo | null {
	// PNG
	if (
		buf.length >= 24 &&
		buf[0] === 0x89 &&
		ascii(buf, 1, 4) === "PNG" &&
		ascii(buf, 12, 16) === "IHDR"
	) {
		const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
		return { mime: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
	}

	// JPEG
	if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
		let i = 2;
		while (i + 8 < buf.length) {
			if (buf[i] !== 0xff) {
				i += 1;
				continue;
			}
			const marker = buf[i + 1];
			if (marker === 0xff) {
				i += 1;
				continue;
			}
			if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
				i += 2;
				continue;
			}
			const isSof =
				marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
			if (isSof) {
				return {
					mime: "image/jpeg",
					height: (buf[i + 5] << 8) | buf[i + 6],
					width: (buf[i + 7] << 8) | buf[i + 8],
				};
			}
			i += 2 + ((buf[i + 2] << 8) | buf[i + 3]);
		}
		return null;
	}

	// WebP
	if (buf.length >= 30 && ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") {
		const kind = ascii(buf, 12, 16);
		if (kind === "VP8 ") {
			return {
				mime: "image/webp",
				width: (buf[26] | (buf[27] << 8)) & 0x3fff,
				height: (buf[28] | (buf[29] << 8)) & 0x3fff,
			};
		}
		if (kind === "VP8L") {
			return {
				mime: "image/webp",
				width: 1 + (buf[21] | ((buf[22] & 0x3f) << 8)),
				height: 1 + ((buf[22] >> 6) | (buf[23] << 2) | ((buf[24] & 0x0f) << 10)),
			};
		}
		if (kind === "VP8X") {
			return {
				mime: "image/webp",
				width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
				height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
			};
		}
	}

	return null;
}

/**
 * Return pesan error, atau null kalau valid.
 * - data URL: dicek byte-nya (magic bytes, ukuran file, dimensi <= 512px)
 * - URL: hanya https. Server tidak pernah fetch URL (mencegah SSRF).
 */
export function validateImageValue(value: string): string | null {
	if (value.startsWith("data:")) {
		const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
		if (!match) return "Image must be a PNG, JPEG, or WebP file";

		let bytes: Uint8Array;
		try {
			bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
		} catch {
			return "Image data is corrupt";
		}
		if (bytes.length > MAX_IMAGE_BYTES) return "Image file is too large (max 300 KB)";

		const info = readImageInfo(bytes);
		if (!info || info.mime !== match[1]) return "Image content does not match its declared type";
		if (info.width < 1 || info.height < 1) return "Image has invalid dimensions";
		if (info.width > MAX_IMAGE_SIDE || info.height > MAX_IMAGE_SIDE) {
			return `Image is ${info.width}×${info.height}px; the maximum is ${MAX_IMAGE_SIDE}×${MAX_IMAGE_SIDE}px`;
		}
		return null;
	}

	if (value.length > MAX_URL_LENGTH) return "Image URL is too long";
	try {
		if (new URL(value).protocol !== "https:") return "Image URL must start with https://";
	} catch {
		return "Image URL is not valid";
	}
	return null;
}
