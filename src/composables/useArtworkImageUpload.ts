import { ref } from "vue";
import { setArtworkImage } from "../db";
import { validateImageFile, type DailyArtwork } from "../domain";

// The file input `accept` value, matching validateImageFile.
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

async function readSize(
  file: File,
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

// Shared by the detail panel and the gallery's pending cards:
// pick → validate → read size → save. Resolves to the updated artwork, or null
// when nothing was saved (the reason is left in `error`).
export function useArtworkImageUpload() {
  const saving = ref(false);
  const error = ref("");
  const warning = ref("");

  async function upload(
    date: string,
    file: File,
    replacing = false,
  ): Promise<DailyArtwork | null> {
    if (saving.value) return null;
    error.value = "";
    warning.value = "";
    const check = validateImageFile(file);
    if (!check.ok) {
      error.value = "只接受 JPG、PNG 或 WebP 圖片。";
      return null;
    }
    saving.value = true;
    try {
      let size: { width: number; height: number };
      try {
        size = await readSize(file);
      } catch {
        error.value = "無法讀取這張圖片，請換一張再試。";
        return null;
      }
      const artwork = await setArtworkImage(date, file, size);
      if (check.warning === "oversize")
        warning.value = "這張圖片超過 4 MB，已存在此裝置，但之後無法自動同步。";
      return artwork;
    } catch (cause) {
      error.value =
        cause instanceof DOMException && cause.name === "QuotaExceededError"
          ? "此裝置的儲存空間不足，圖片沒有保存。"
          : replacing
            ? "替換失敗，已保留原本的圖片。"
            : cause instanceof Error
              ? cause.message
              : "圖片保存失敗。";
      return null;
    } finally {
      saving.value = false;
    }
  }

  return { saving, error, warning, upload };
}
