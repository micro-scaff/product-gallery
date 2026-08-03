import { redirect } from "next/navigation";

// The product list is the default C-end entry.
export default function HomePage() {
  redirect("/products");
}
