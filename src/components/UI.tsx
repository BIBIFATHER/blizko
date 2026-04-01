// Legacy barrel — proxies through ui/index.ts
// Prefer: import { Button } from "@/components/ui"
// Still works: import { Button } from "./UI"

export { Card, Divider, Section, CuratorsNote } from "./ui/surface-primitives";
export {
  Button,
  Checkbox,
  ChipGroup,
  Input,
  RangeSlider,
  Select,
  Textarea,
} from "./ui/form-primitives";
export {
  Badge,
  EmptyState,
  ErrorState,
  ProgressBar,
  Skeleton,
  StatusIndicator,
} from "./ui/feedback-primitives";
export { ModalShell } from "./ui/modal-shell";
export { Avatar } from "./ui/avatar";
export { Tooltip } from "./ui/tooltip";
export { Tabs, TabList, Tab, TabPanel } from "./ui/tabs";
export { ToastProvider, useToast } from "./ui/toast";
