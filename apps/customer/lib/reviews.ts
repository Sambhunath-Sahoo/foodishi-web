"use client";

import { createLocalStore, isRecord, localId, parseList } from "./local-store";

/**
 * Ratings and written reviews. Browser-only for now — there is no /reviews
 * endpoint — so these sit beside the restaurant's own `rating` column from the
 * API rather than replacing it. The restaurant page shows both, labelled, so
 * nobody mistakes one device's reviews for the platform's score.
 *
 * A review is tied to an order: you rate what you actually ate. That is also
 * what stops the same order being reviewed twice.
 */
const STORAGE_KEY = "foodishi.customer.reviews.v1";

export const MIN_STARS = 1;
export const MAX_STARS = 5;

export interface Review {
  readonly id: string;
  readonly orderId: number;
  readonly restaurantId: number;
  readonly restaurantName: string;
  /** Whole stars, MIN_STARS..MAX_STARS. */
  readonly restaurantStars: number;
  /** The food specifically, which is not always the same as the service. */
  readonly foodStars: number;
  readonly comment: string;
  readonly authorName: string;
  readonly createdAt: string;
}

function isReview(value: unknown): value is Review {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.orderId === "number" &&
    typeof value.restaurantId === "number" &&
    typeof value.restaurantStars === "number" &&
    typeof value.foodStars === "number" &&
    typeof value.comment === "string" &&
    typeof value.createdAt === "string"
  );
}

const store = createLocalStore<readonly Review[]>(STORAGE_KEY, [], (raw) =>
  parseList(raw, isReview),
);

export interface ReviewDraft {
  readonly orderId: number;
  readonly restaurantId: number;
  readonly restaurantName: string;
  readonly restaurantStars: number;
  readonly foodStars: number;
  readonly comment: string;
  readonly authorName: string;
}

export function clampStars(stars: number): number {
  if (!Number.isFinite(stars)) return MIN_STARS;
  return Math.min(Math.max(Math.round(stars), MIN_STARS), MAX_STARS);
}

/** The mean of what this device has written, or null when nothing has been. */
export function averageStars(reviews: readonly Review[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.restaurantStars, 0);
  return total / reviews.length;
}

export interface ReviewsApi {
  readonly reviews: readonly Review[];
  readonly isReady: boolean;
  readonly forRestaurant: (restaurantId: number) => readonly Review[];
  readonly forOrder: (orderId: number) => Review | null;
  /** Upsert: re-reviewing an order edits that review rather than adding one. */
  readonly save: (draft: ReviewDraft) => void;
  readonly remove: (id: string) => void;
}

export function useReviews(): ReviewsApi {
  const [reviews, isReady] = store.use();

  return {
    reviews,
    isReady,
    forRestaurant: (restaurantId) =>
      reviews.filter((review) => review.restaurantId === restaurantId),
    forOrder: (orderId) =>
      reviews.find((review) => review.orderId === orderId) ?? null,

    save: (draft) => {
      store.update((current) => {
        const next: Omit<Review, "id" | "createdAt"> = {
          ...draft,
          restaurantStars: clampStars(draft.restaurantStars),
          foodStars: clampStars(draft.foodStars),
          comment: draft.comment.trim(),
        };
        const existing = current.find((review) => review.orderId === draft.orderId);
        if (existing !== undefined) {
          return current.map((review) =>
            review.id === existing.id
              ? { ...review, ...next, createdAt: new Date().toISOString() }
              : review,
          );
        }
        return [
          { ...next, id: localId("rev"), createdAt: new Date().toISOString() },
          ...current,
        ];
      });
    },

    remove: (id) => {
      store.update((current) => current.filter((review) => review.id !== id));
    },
  };
}
