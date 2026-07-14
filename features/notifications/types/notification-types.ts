export type NotificationType =
  | "BookingCreated"
  | "BookingReminder"
  | "BookingCancelled"
  | "BookingCompleted"
  | "TierUpgraded"
  | "RewardRedeemed"
  | "IdentityApproved"
  | "IdentityRejected"
  | "SystemAlert";

export type NotificationTone = "default" | "error";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  tone?: NotificationTone;
};

export type GetNotificationsParams = {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
};
