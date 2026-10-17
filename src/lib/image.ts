/**
 * Product image validation. Pure functions so the SAME rules run in the
 * browser (fast feedback) and on the server (authoritative check).
 *
 * Rules:
 *  - Only embedded raster images as base64 data URLs (PNG, JPEG, WebP, GIF).
 *    SVG is rejected on purpose: it can carry script.
 *  - The bytes must actually match the declared MIME type (magic bytes).
 *  - Width and height must be <= MAX_PRODUCT_IMAGE_SIDE, read from the file header.
 *  - The encoded size is capped so the in-memory store cannot be abused.
 */

export const MAX_PRODUCT_IMAGE_SIDE = 512;
export const MAX_PRODUCT_IMAGE_BYTES = 400_000;
export const MAX_PRODUCT_IMAGE_DATA_URL_LENGTH = Math.ceil((MAX_PRODUCT_IMAGE_BYTES * 4) / 3) + 64;

type ImageFormat = "png" | "jpeg" | "webp" | "gif";

const MIME_TO_FORMAT: Record<string, ImageFormat> = {
	"image/png": "png",
	"image/jpeg": "jpeg",
	"image/webp": "webp",
	"image/gif": "gif",
};

const DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

export function decodeBase64(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function u16be(b: Uint8Array, o: number) {
	return (b[o] << 8) | b[o + 1];
}
function u32be(b: Uint8Array, o: number) {
	return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}
function u16le(b: Uint8Array, o: number) {
	return b[o] | (b[o + 1] << 8);
}
function u24le(b: Uint8Array, o: number) {
	return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
}
function ascii(b: Uint8Array, o: number, len: number) {
	return String.fromCharCode(...b.subarray(o, o + len));
}

/** Detect the real format from magic bytes and read its pixel dimensions. */
export function measureImage(
	bytes: Uint8Array,
): { format: ImageFormat; width: number; height: number } | null {
	// PNG
	if (
		bytes.length >= 24 &&
		bytes[0] === 0x89 &&
		ascii(bytes, 1, 3) === "PNG" &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a
	) {
		return { format: "png", width: u32be(bytes, 16), height: u32be(bytes, 20) };
	}
	// GIF
	if (bytes.length >= 10 && ascii(bytes, 0, 4) === "GIF8") {
		return { format: "gif", width: u16le(bytes, 6), height: u16le(bytes, 8) };
	}
	// WebP
	if (bytes.length >= 30 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
		const chunk = ascii(bytes, 12, 4);
		if (chunk === "VP8 ") {
			return {
				format: "webp",
				width: u16le(bytes, 26) & 0x3fff,
				height: u16le(bytes, 28) & 0x3fff,
			};
		}
		if (chunk === "VP8L") {
			const v = u32le(bytes, 21);
			return { format: "webp", width: (v & 0x3fff) + 1, height: ((v >>> 14) & 0x3fff) + 1 };
		}
		if (chunk === "VP8X") {
			return {
				format: "webp",
				width: u24le(bytes, 24) + 1,
				height: u24le(bytes, 27) + 1,
			};
		}
		return null;
	}
	// JPEG: walk the marker segments until a Start Of Frame marker.
	if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
		let i = 2;
		while (i + 4 <= bytes.length) {
			if (bytes[i] !== 0xff) {
				i++;
				continue;
			}
			const marker = bytes[i + 1];
			if (marker === 0xff) {
				i++;
				continue;
			}
			if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
				i += 2;
				continue;
			}
			if (marker === 0xd9 || marker === 0xda) {
				return null;
			}
			const isStartOfFrame =
				marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
			if (isStartOfFrame) {
				if (i + 9 > bytes.length) return null;
				return { format: "jpeg", height: u16be(bytes, i + 5), width: u16be(bytes, i + 7) };
			}
			i += 2 + u16be(bytes, i + 2);
		}
		return null;
	}
	return null;
}

function u32le(b: Uint8Array, o: number) {
	return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

/** Returns a human-readable problem, or null when the image is acceptable. */
export function validateProductImage(dataUrl: string): string | null {
	if (dataUrl.length > MAX_PRODUCT_IMAGE_DATA_URL_LENGTH) {
		return "Image is too large. Use a smaller image.";
	}
	const match = DATA_URL_PATTERN.exec(dataUrl);
	if (!match) {
		return "Image must be a PNG, JPEG, WebP or GIF file.";
	}
	const mime = match[1];
	const bytes = decodeBase64(match[2]);
	if (bytes.length > MAX_PRODUCT_IMAGE_BYTES) {
		return "Image file is too large.";
	}
	const info = measureImage(bytes);
	if (!info || info.format !== MIME_TO_FORMAT[mime]) {
		return "The file contents do not match an image type.";
	}
	if (info.width < 1 || info.height < 1) {
		return "Image has invalid dimensions.";
	}
	if (info.width > MAX_PRODUCT_IMAGE_SIDE || info.height > MAX_PRODUCT_IMAGE_SIDE) {
		return `Image must be at most ${MAX_PRODUCT_IMAGE_SIDE}×${MAX_PRODUCT_IMAGE_SIDE}px (got ${info.width}×${info.height}).`;
	}
	return null;
}
