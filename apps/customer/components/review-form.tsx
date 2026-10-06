"use client";

import * as React from "react";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@repo/ui";
import { StarPicker } from "./star-rating";
import { MAX_STARS, useReviews } from "../lib/reviews";

const MAX_COMMENT = 500;

/**
 * Rate the kitchen and the food, from an order that has been delivered.
 * Re-opening it on an already-reviewed order edits that review instead of
 * stacking a second one — see reviews.save().
 */
export function ReviewForm({
  orderId,
  restaurantId,
  restaurantName,
  authorName,
  onDone,
}: {
  readonly orderId: number;
  readonly restaurantId: number;
  readonly restaurantName: string;
  readonly authorName: string;
  readonly onDone?: () => void;
}): React.JSX.Element {
  const { forOrder, save, isReady } = useReviews();
  const existing = forOrder(orderId);

  const [restaurantStars, setRestaurantStars] = React.useState(0);
  const [foodStars, setFoodStars] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [isSaved, setIsSaved] = React.useState(false);

  // Storage is read after mount, so the form fills in once it is available.
  //
  // Keyed on the review's id, not on `existing` itself: that object is rebuilt
  // every render, so depending on it would re-seed the fields on every
  // keystroke and throw away what is being typed. The seed is wanted once per
  // review, which is exactly what the id changing means.
  const existingId = existing?.id ?? null;
  React.useEffect(() => {
    if (existing === null) return;
    setRestaurantStars(existing.restaurantStars);
    setFoodStars(existing.foodStars);
    setComment(existing.comment);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [existingId]);

  const isValid = restaurantStars > 0 && foodStars > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existing === null ? "Rate this order" : "Edit your review"}</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isValid) return;
            save({
              orderId,
              restaurantId,
              restaurantName,
              restaurantStars,
              foodStars,
              comment,
              authorName,
            });
            setIsSaved(true);
            onDone?.();
          }}
        >
          <StarPicker
            name={`restaurant-stars-${orderId}`}
            label={`${restaurantName} overall`}
            value={restaurantStars}
            onChange={(stars) => {
              setRestaurantStars(stars);
              setIsSaved(false);
            }}
          />
          <StarPicker
            name={`food-stars-${orderId}`}
            label="The food itself"
            value={foodStars}
            onChange={(stars) => {
              setFoodStars(stars);
              setIsSaved(false);
            }}
          />

          <div>
            <label
              htmlFor={`review-comment-${orderId}`}
              className="mb-1.5 block text-[13px] font-medium text-ink-2"
            >
              Anything worth saying?{" "}
              <span className="font-normal text-ink-3">Optional</span>
            </label>
            <textarea
              id={`review-comment-${orderId}`}
              value={comment}
              maxLength={MAX_COMMENT}
              rows={3}
              placeholder="The biryani was worth the wait."
              onChange={(event) => {
                setComment(event.target.value);
                setIsSaved(false);
              }}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent"
            />
            <p className="mt-1 text-right text-[12px] tabular-nums text-ink-3">
              {`${comment.length}/${MAX_COMMENT}`}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button type="submit" size="lg" className="w-auto" disabled={!isValid || !isReady}>
              {existing === null ? "Post review" : "Save changes"}
            </Button>
            {isSaved ? (
              <p aria-live="polite" className="text-[13px] text-ok">
                Saved on this device.
              </p>
            ) : (
              <p className="text-[12px] text-ink-3">
                {`Both ratings are required (1–${MAX_STARS}).`}
              </p>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
