/**
 * Browser-only helper: turns a user-picked file into a downscaled JPEG data
 * URL that always satisfies `validateProductImage`. Runs before submit so
 * large photos are shrunk instead of rejected.
 */
import {
	MAX_PRODUCT_IMAGE_DATA_URL_LENGTH,
	MAX_PRODUCT_IMAGE_SIDE,
	validateProductImage,
} from "./image";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("That file could not be read as an image."));
		};
		img.src = url;
	});
}

export async function fileToProductImageDataUrl(file: File): Promise<string> {
	if (!ALLOWED_TYPES.includes(file.type)) {
		throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new Error("Image must be 10 MB or smaller.");
	}

	const img = await loadImage(file);
	const longest = Math.max(img.naturalWidth, img.naturalHeight);
	if (!longest) {
		throw new Error("That image has no dimensions.");
	}
	const scale = Math.min(1, MAX_PRODUCT_IMAGE_SIDE / longest);
	const width = Math.max(1, Math.round(img.naturalWidth * scale));
	const height = Math.max(1, Math.round(img.naturalHeight * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Your browser cannot process images.");
	}
	// White backdrop so transparent PNGs look sensible as JPEG.
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, width, height);
	ctx.drawImage(img, 0, 0, width, height);

	for (const quality of [0.9, 0.8, 0.7, 0.6]) {
		const dataUrl = canvas.toDataURL("image/jpeg", quality);
		if (dataUrl.length <= MAX_PRODUCT_IMAGE_DATA_URL_LENGTH && !validateProductImage(dataUrl)) {
			return dataUrl;
		}
	}
	throw new Error("This image is too detailed to store. Try a simpler image.");
}
