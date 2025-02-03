import { LocalStorage } from "@raycast/api";
import { baseHeaders } from "./constants";

export async function getAuthHeaders() {
  const sessionSecret = await LocalStorage.getItem<string>("sessionSecret");
  return {
    ...baseHeaders,
    "expo-session": sessionSecret || "",
  };
}

export function changeCase(
  inputString: string,
  targetCasing: "lower" | "upper" | "title" | "sentence" | "camel" | "kebab" | "snake",
): string {
  try {
    switch (targetCasing) {
      case "lower":
        return inputString.toLowerCase();
      case "upper":
        return inputString.toUpperCase();
      case "title":
        return inputString.replace(/\b\w/g, (char) => char.toUpperCase());
      case "sentence":
        return inputString.charAt(0).toUpperCase() + inputString.slice(1).toLowerCase();
      case "camel":
        return inputString.replace(/[-_\s]+(.)?/g, (_match, char) => (char ? char.toUpperCase() : ""));
      case "kebab":
        return inputString.replace(/\s+/g, "-").toLowerCase();
      case "snake":
        return inputString.replace(/\s+/g, "_").toLowerCase();
      default:
        return inputString;
    }
  } catch (e) {
    return inputString;
  }
}
