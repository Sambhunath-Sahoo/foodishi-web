/** @repo/ui — the "Neel" design system, built on packages/ui/src/styles/tokens.css. */

export { cn } from "./lib/cn";

export {
  TONE_DOT,
  TONE_FILL,
  TONE_ROW_STRIPE,
  TONE_SOFT,
  TONE_STRIPE,
  TONE_TEXT,
  type Tone,
} from "./status/tone";

/* Command Deck — severity grading (DENSITY.md §3). */
export {
  formatLate,
  formatSpan,
  lateTier,
  SEVERITY_LABEL,
  SEVERITY_SOFT,
  SEVERITY_STRIPE,
  SEVERITY_TEXT,
  SEVERITY_TONE,
  type SeverityTier,
} from "./status/severity";

export { formatAgo, useSecondsSince } from "./lib/freshness";

export {
  ORDER_STATUSES,
  getOrderStatusLabel,
  getOrderStatusPresentation,
  getOrderStatusTone,
  type OrderStatus,
  type OrderStatusOrLate,
} from "./status/order-status";

/* Command Deck — the density primitives. */
export {
  AutoScaleChart,
  type AutoChartPoint,
  type AutoScaleChartProps,
} from "./components/auto-chart";
export {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  SeverityCell,
  TableFooter,
  type DataTableCellProps,
  type DataTableHeaderCellProps,
  type DataTableProps,
  type DataTableRowProps,
  type DataTableScrollProps,
  type SeverityCellProps,
  type TableFooterProps,
} from "./components/data-table";
export {
  Stat,
  StatRail,
  type StatProps,
  type StatRailProps,
  type StatTone,
} from "./components/stat-rail";
export {
  FilterChip,
  Freshness,
  Kbd,
  KbdHint,
  LiveDot,
  Toolbar,
  type FilterChipProps,
  type FreshnessProps,
  type KbdHintProps,
  type KbdProps,
  type LiveDotProps,
  type ToolbarProps,
} from "./components/toolbar";

export { Badge, type BadgeProps } from "./components/badge";
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardProps,
} from "./components/card";
export {
  Dialog,
  DialogClose,
  DialogRoot,
  DialogTrigger,
  type DialogProps,
} from "./components/dialog";
export {
  DevIdentityBar,
  type DevIdentityBarProps,
} from "./components/dev-identity-bar";
export {
  DevIdentitySwitcher,
  type DevIdentitySwitcherProps,
} from "./components/dev-identity-switcher";
export { EmptyState, type EmptyStateProps } from "./components/empty-state";
export { ErrorBanner, type ErrorBannerProps } from "./components/error-banner";
export { Field, Input, type FieldProps, type InputProps } from "./components/input";
export { PageTitle, type PageTitleProps } from "./components/page-title";
export { Pagination, type PaginationProps } from "./components/pagination";
export {
  Select,
  type SelectOption,
  type SelectProps,
} from "./components/select";
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from "./components/segmented-control";
export { Skeleton, SkeletonRows, type SkeletonProps } from "./components/skeleton";
export { StatusChip, type StatusChipProps } from "./components/status-chip";
export { Thumb, type ThumbProps } from "./components/thumb";
export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
  type TableCellProps,
  type TableHeaderCellProps,
  type TableProps,
  type TableRowProps,
} from "./components/table";
export {
  Timeline,
  type TimelineEntry,
  type TimelineProps,
} from "./components/timeline";
export { UsageBar, type UsageBarProps } from "./components/usage-bar";

export { ThemeSwitcher, type ThemeSwitcherProps } from "./theme/theme-switcher";
export {
  applyTheme,
  isThemeChoice,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  THEME_CHOICES,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "./theme/theme";

// The /creds page, shared by all three consoles. Development only — see the
// module docstring; it renders a refusal in a production build.
export {
  DevCredentialsPage,
  isDevCredentialsVisible,
} from "./patterns/dev-credentials-page";
