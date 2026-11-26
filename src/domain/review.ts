/** Ratings at or above this go to the public Google review page; below stays private with the owner. */
export const PUBLIC_REVIEW_MIN_RATING = 4;

export type ReviewRoute = "google" | "private";

export function routeReview(rating: number): ReviewRoute {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("rating must be 1 to 5");
  return rating >= PUBLIC_REVIEW_MIN_RATING ? "google" : "private";
}

export function averageRating(ratings: readonly number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}
