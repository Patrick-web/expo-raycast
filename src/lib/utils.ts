import { LocalStorage } from "@raycast/api";
import { baseHeaders } from "./constants";

export async function getAuthHeaders() {
  const sessionSecret = await LocalStorage.getItem<string>("sessionSecret");
  return {
    ...baseHeaders,
    "expo-session": sessionSecret || "",
  };
}
