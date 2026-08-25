import { redirect } from "next/navigation";

/** Theory picker lives on the Exercise Studio Theory tab. */
export default function TheoryExercisesIndexPage() {
  redirect("/exercises");
}
