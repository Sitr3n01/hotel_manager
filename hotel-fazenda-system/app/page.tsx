import { redirect } from "next/navigation";

// The middleware already enforces auth. Send the user to the right place.
export default function RootPage() {
  redirect("/dashboard");
}
