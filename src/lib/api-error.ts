import axios from "axios";

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (Array.isArray(data?.message)) {
      return data.message
        .map((item: any) => item?.message || "Dữ liệu không hợp lệ")
        .join(", ");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }
  }

  if (error instanceof Error) return error.message;
  return "Đã có lỗi xảy ra, vui lòng thử lại.";
}
