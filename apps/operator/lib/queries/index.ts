/**
 * Every read and write this console makes. Components import a hook from here
 * and never touch a service directly, so the data contract lives in one place
 * and a change of source lands in `lib/services/index.ts` alone.
 *
 * Split by domain rather than kept as one file because the surface grew: eleven
 * sections, thirty-odd hooks. `keys.ts` holds the cache keys so a mutation's
 * invalidation and a query's key cannot drift apart.
 */
export { fingerprint, keys } from "./keys";

export {
  LIVE_REFETCH_MS,
  METRICS_STALE_MS,
  useFunnel,
  useOrdersOverTime,
  useRestaurantMetrics,
  useSummary,
  useWorkload,
} from "./metrics";

export {
  useCuisines,
  useRestaurant,
  useRestaurantDirectory,
  useRestaurants,
  useSetRestaurantActive,
  useUpdateRestaurant,
  type SetRestaurantActiveInput,
  type UpdateRestaurantInput,
} from "./catalog";

export {
  CUSTOMER_PAGE_SIZE,
  useCustomerDirectory,
  useCustomers,
  useDeactivatedCustomerCount,
  useSetCustomerActive,
  useUser,
  useUserAddresses,
  type CustomerFilters,
  type SetCustomerActiveInput,
} from "./people";

export {
  MAX_PAGE_SIZE,
  ORDER_PAGE_SIZE,
  RIDER_STALE_MS,
  useCustomerOrders,
  useLiveOrders,
  useOrderDelivery,
  useOrderDeliveries,
  useOrderDetail,
  useOrderEvents,
  useOrdersBoard,
} from "./orders";

export {
  DELIVERY_PAGE_SIZE,
  useActiveRides,
  useDeliveries,
  useDeliveryCounts,
  useDeliveryPartners,
  useMarkDeliveryFailed,
  useReassignDelivery,
  type MarkFailedInput,
  type ReassignInput,
} from "./deliveries";

export {
  useCoupons,
  useCreateCoupon,
  useSetCouponActive,
  useUpdateCoupon,
  type SetCouponActiveInput,
  type UpdateCouponInput,
} from "./offers";

export {
  LEDGER_DEFAULT_DAYS,
  REFUND_PAGE_SIZE,
  TRANSACTION_PAGE_SIZE,
  useCompleteRefund,
  useLedger,
  useOrderPayments,
  useOrderRefunds,
  usePaymentCounts,
  useRefundCounts,
  useRefunds,
  useRetryRefund,
  useTransactions,
} from "./finance";

export {
  useCommissionReport,
  useCustomerReport,
  useOrderReport,
  useRestaurantReport,
  useSalesReport,
} from "./reports";

export { useResetSettings, useSaveSettings, useSettings } from "./settings";

export {
  APPLICATION_PAGE_SIZE,
  useApplications,
  useApproveApplication,
  useRejectApplication,
  type ApproveApplicationInput,
  type RejectApplicationInput,
} from "./applications";
