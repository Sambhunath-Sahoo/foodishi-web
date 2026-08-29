"use client";

import * as React from "react";
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState } from "@repo/ui";
import { StarRating } from "./star-rating";
import { formatDateTime, formatRating } from "../lib/format";
import { averageStars, useReviews } from "../lib/reviews";

/**
 * Reviews for one kitchen.
 *
 * The platform's own `rating` column and this device's reviews are two
 * different numbers, so both are shown and both are labelled. Presenting one
 * as the other would be a lie the customer cannot check.
 */
export function ReviewList({
  restaurantId,
  platformRating,
  platformRatingCount,
}: {
  readonly restaurantId: number;
  readonly platformRating: string;
  readonly platformRatingCount: number;
}): React.JSX.Element {
  const { forRestaurant, isReady } = useReviews();
  const reviews = forRestaurant(restaurantId);
  const mine = averageStars(reviews);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ratings &amp; reviews</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">
              All customers
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums text-ink">
                {formatRating(platformRating)}
              </span>
              <span className="text-[13px] tabular-nums text-ink-3">
                {`${platformRatingCount.toLocaleString()} ratings`}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">
              Your reviews
            </p>
            <div className="mt-1">
              {mine === null ? (
                <span className="text-[13px] text-ink-3">None yet</span>
              ) : (
                <StarRating value={mine} count={reviews.length} />
              )}
            </div>
          </div>
        </div>

        {!isReady ? null : reviews.length === 0 ? (
          <EmptyState
            title="You have not reviewed this kitchen"
            detail="Rate an order once it has been delivered and it shows up here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-card border border-line bg-surface-2 px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StarRating value={review.restaurantStars} />
                  <span className="text-[12px] tabular-nums text-ink-3">
                    {formatDateTime(review.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="cool">{`Food ${review.foodStars}/5`}</Badge>
                  <Badge tone="mute">{`Order #${review.orderId}`}</Badge>
                </div>
                {review.comment.length > 0 ? (
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                    {review.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <p className="text-[12px] leading-relaxed text-ink-3">
          Reviews you write are saved on this device only — there is no reviews
          endpoint yet, so they do not move the kitchen&apos;s public score.
        </p>
      </CardBody>
    </Card>
  );
}
