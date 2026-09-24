export interface User {
  id: string;
  email?: string;
  number?: string;
  pushTokens?: PushToken[];
}

export type UserParams = Partial<User>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NotificationAPIClientInterface {
  identify(user: UserParams): Promise<void>;
  showInApp: (options: InAppOptions) => void;
  showUserPreferences: (options?: UserPreferencesOptions) => void;
  getUserPreferences: () => Promise<Preference[]>;
  patchUserPreference: (
    notificationId: string,
    channel: string,
    state: boolean,
    subNotificationId?: string
  ) => void;
  openInAppPopup: () => void;
  closeInAppPopup: () => void;
  setInAppUnread: (count: number) => void;
  renderPreferences: (preferences: Preference[]) => void;
  destroy: () => void;
  websocket?: WebSocket;
  elements: {
    footer?: HTMLDivElement;
    unread?: HTMLDivElement;
    popup?: HTMLDivElement;
    popupInner?: HTMLDivElement;
    button?: HTMLButtonElement;
    root?: HTMLElement;
    empty?: HTMLDivElement;
    notificationsLoading?: HTMLDivElement;
    header?: HTMLDivElement;
    preferencesContainer?: HTMLDivElement;
    preferencesPopup?: HTMLDivElement;
    preferencesLoading?: HTMLDivElement;
    preferencesEmpty?: HTMLDivElement;
    preferencesGrid?: HTMLDivElement;
    prevButton?: HTMLButtonElement;
    nextButton?: HTMLButtonElement;
    notificationMenu?: HTMLDivElement;
  };
  state: {
    currentPage: number;
    pageSize: number;
    lastNotificationsRequestAt: number;
    notifications: InappNotification[];
    unread: number;
    oldestNotificationsDate: string;
    lastResponseNotificationsCount?: number;
    inappOptions?: InAppOptions;
    initOptions: InitOptions;
    restBaseURL: string;
  };
  websocketHandlers: {
    notifications: (message: WS_NotificationsResponse) => void;
    newNotifications: (message: WS_NewNotificationsResponse) => void;
    unreadCount: (message: WS_UnreadCountResponse) => void;
  };
}

export enum MarkAsReadModes {
  AUTOMATIC = 'AUTOMATIC', // notificaitons are set to read when user sees the notification
  MANUAL = 'MANUAL', // notifications are set to read manually by the user
  MANUAL_AND_CLICK = 'MANUAL_AND_CLICK' // notifications are set to read manually by the user and also when user clicks the notification
}
export type SupportedLanguages =
  | 'en-US'
  | 'es-ES'
  | 'fr-FR'
  | 'it-IT'
  | 'nl-NL'
  | 'pt-BR';

export type TranslationObject = {
  [K in SupportedLanguages]: {
    translation: Record<string, string>;
  };
};
export interface InitOptions {
  clientId: string;
  userId: string;
  userIdHash?: string;
  websocket?: string | false;
  restBaseURL?: string;
  language?: SupportedLanguages;
}
export interface InAppOptions {
  root: string;
  inline?: boolean;
  popupPosition?: PopupPosition;
  paginated?: boolean;
  pageSize?: number;
  markAsReadMode?: MarkAsReadModes;
}

export interface UserPreferencesOptions {
  parent: string;
}

export enum PopupPosition {
  TopLeft = 'topLeft',
  TopRight = 'topRight',
  LeftTop = 'leftTop',
  LeftBottom = 'leftBottom',
  BottomLeft = 'bottomLeft',
  BottomRight = 'bottomRight',
  RightTop = 'rightTop',
  RightBottom = 'rightBottom'
}

export interface InappNotification {
  id: string;
  seen: boolean;
  title: string;
  redirectURL?: string;
  imageURL?: string;
  date: string; // ISO date
}

export interface Preference {
  notificationId: string;
  title: string;
  settings: {
    channel: string;
    channelName: string;
    state: boolean;
  }[];
  subNotificationPreferences?: (Omit<
    Preference,
    'subNotificationPreferences'
  > & { subNotificationId: string })[];
}

export interface WS_NotificationsRequest {
  route: 'inapp_web/notifications';
  payload: {
    before?: string; // ISO date
    count: number;
  };
}

export interface WS_NotificationsResponse {
  route: 'inapp_web/notifications';
  payload: {
    notifications: InappNotification[];
  };
}

export interface WS_UnreadCountResponse {
  route: 'inapp_web/unread_count';
  payload: {
    count: number;
  };
}

export interface WS_UnreadCountRequest {
  route: 'inapp_web/unread_count';
}

export interface WS_ClearUnreadRequest {
  route: 'inapp_web/unread_clear';
  payload?: {
    notificationId?: string;
  };
}

export interface WS_NewNotificationsResponse {
  route: 'inapp_web/new_notifications';
  payload: {
    notifications: InappNotification[];
  };
}

export interface WS_UserPreferencesRequest {
  route: 'user_preferences/get_preferences';
}

export interface WS_UserPreferencesResponse {
  route: 'user_preferences/preferences';
  payload: {
    userPreferences: Preference[];
  };
}
export interface WS_UserPreferencesPatchRequest {
  route: 'user_preferences/patch_preferences';
  payload: {
    notificationId: string;
    subNotificationId?: string;
    channelPreferences: { channel: string; state: boolean }[];
  }[];
}

export type WS_ANY_VALID_REQUEST =
  | WS_NotificationsRequest
  | WS_ClearUnreadRequest
  | WS_UnreadCountRequest
  | WS_UserPreferencesRequest
  | WS_UserPreferencesRequest
  | WS_UserPreferencesPatchRequest;

export interface PushToken {
  type: PushProviders;
  token: string;
  device: Device;
}
export enum PushProviders {
  FCM = 'FCM',
  APN = 'APN'
}
export interface Device {
  app_id?: string;
  ad_id?: string;
  device_id: string;
  platform?: string;
  manufacturer?: string;
  model?: string;
}
