/**
 * Serverin qəbul etdiyi şəkil uzantıları (API AttachmentService.AllowedExtensionsByType ilə eyni).
 * "image/*" HEIC, AVIF, SVG kimi formatları da seçdirirdi, server isə onları 400 ilə rədd edirdi.
 */
export const ACCEPTED_IMAGE_TYPES = '.jpg,.jpeg,.png,.gif,.webp,.bmp';
