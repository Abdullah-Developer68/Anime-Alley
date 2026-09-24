// server/utils/volume.utils.js

/**
 * Regex for standard comic volume format.
 * Matches 'V' followed by one or more digits (e.g., 'V1', 'V2', 'V10').
 */
const COMIC_VOLUME_REGEX = /^V\d+$/;

/**
 * Validates whether a comic volume label, array of volume labels, or array of variant objects conforms to 'V<number>'.
 *
 * @param {string|Array<string|{ label: string }>} input - Single volume label or array of volume strings/variant objects.
 * @returns {{ valid: boolean, invalidVolume?: string, message?: string }}
 */
const validateComicVolumes = (input) => {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed || !COMIC_VOLUME_REGEX.test(trimmed)) {
      return {
        valid: false,
        invalidVolume: input,
        message: `Invalid comic volume format: "${input}". Volume labels must follow the format 'V<number>' (e.g. V1, V2)`,
      };
    }
    return { valid: true };
  }

  if (!Array.isArray(input) || input.length === 0) {
    return {
      valid: false,
      message: "Variants must be a non-empty array for comics",
    };
  }

  for (const item of input) {
    const label = typeof item === "string" ? item : item?.label;
    if (typeof label !== "string" || !COMIC_VOLUME_REGEX.test(label.trim())) {
      return {
        valid: false,
        invalidVolume: label,
        message: `Invalid comic volume format: "${label}". Volume labels must follow the format 'V<number>' (e.g. V1, V2)`,
      };
    }
  }

  return { valid: true };
};

module.exports = {
  validateComicVolumes,
};
