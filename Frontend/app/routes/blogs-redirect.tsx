import { redirect } from "react-router";

export function clientLoader() {
  return redirect("/blog");
}

export default function BlogsRedirect() {
  return null;
}
