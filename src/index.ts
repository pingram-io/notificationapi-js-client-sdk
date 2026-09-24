import {
  InappNotification,
  InAppOptions,
  InitOptions,
  NotificationAPIClientInterface,
  PopupPosition,
  Preference,
  MarkAsReadModes,
  UserPreferencesOptions,
  WS_ANY_VALID_REQUEST,
  WS_NewNotificationsResponse,
  WS_NotificationsRequest,
  WS_NotificationsResponse,
  WS_UnreadCountResponse,
  WS_UserPreferencesPatchRequest,
  WS_UserPreferencesResponse,
  UserParams,
  TranslationObject,
  SupportedLanguages
} from './interfaces';
import timeAgo from './utils/timeAgo';
import i18n from 'i18next';
import enUS from './assets/i18n/en-US.json';
import esES from './assets/i18n/es-ES.json';
import frFR from './assets/i18n/fr-FR.json';
import itIT from './assets/i18n/it-IT.json';
import nlNL from './assets/i18n/nl-NL.json';
import ptBR from './assets/i18n/pt-BR.json';

const defaultRestAPIUrl = 'https://api.notificationapi.com';
const defaultWebSocket = 'wss://ws.notificationapi.com';
const NOTIFICATION_REQUEST_COUNT = 50;
const supportedLanguages: SupportedLanguages[] = [
  'en-US',
  'es-ES',
  'fr-FR',
  'it-IT',
  'nl-NL',
  'pt-BR'
];
const supportedLanguagesFile: {
  [l in SupportedLanguages]: Record<string, string>;
} = {
  'en-US': enUS,
  'es-ES': esES,
  'fr-FR': frFR,
  'it-IT': itIT,
  'nl-NL': nlNL,
  'pt-BR': ptBR
};
const PAGE_SIZE = 5;
function position(
  popup: HTMLDivElement,
  popupInner: HTMLDivElement,
  button: HTMLButtonElement,
  popupPosition: PopupPosition
) {
  const position: string = popupPosition.toString();

  let maxHeight = document.documentElement.clientHeight + 'px';
  let top = 'auto';
  let bottom = 'auto';
  let left = 'auto';
  let right = 'auto';

  if (window.innerWidth < 768) {
    top = -button.getBoundingClientRect().top + 'px';
    bottom =
      -(
        document.documentElement.clientHeight -
        button.getBoundingClientRect().bottom
      ) + 'px';
    left = -button.getBoundingClientRect().left + 'px';
    right =
      -(
        document.documentElement.clientWidth -
        button.getBoundingClientRect().right
      ) + 'px';
  } else {
    if (position.startsWith('top')) {
      bottom = button.clientHeight + 10 + 'px';
      maxHeight = button.getBoundingClientRect().top - 20 + 'px';
    }

    if (position.startsWith('bottom')) {
      bottom = 'auto';
      top = button.clientHeight + 10 + 'px';
      maxHeight =
        window.innerHeight - button.getBoundingClientRect().bottom - 40 + 'px';
    }

    if (position.startsWith('left')) {
      left = 'auto';
      right = button.clientWidth + 10 + 'px';
    }

    if (position.startsWith('right')) {
      right = 'auto';
      left = button.clientWidth + 10 + 'px';
    }

    if (position.endsWith('Top')) {
      top = 'auto';
      bottom = '0px';
      maxHeight = button.getBoundingClientRect().bottom - 20 + 'px';
    }

    if (position.endsWith('Bottom')) {
      bottom = 'auto';
      top = '0px';
      maxHeight =
        window.innerHeight - button.getBoundingClientRect().top - 40 + 'px';
    }

    if (position.endsWith('Left')) {
      left = 'auto';
      right = '0px';
    }

    if (position.endsWith('Right')) {
      right = 'auto';
      left = '0px';
    }
  }

  popup.style.top = top;
  popup.style.bottom = bottom;
  popup.style.left = left;
  popup.style.right = right;
  popupInner.style.maxHeight = maxHeight;
}

class NotificationAPIClient implements NotificationAPIClientInterface {
  state: NotificationAPIClientInterface['state'];
  elements: NotificationAPIClientInterface['elements'];
  websocket?: WebSocket;
  websocketHandlers: {
    notifications: (message: WS_NotificationsResponse) => void;
    newNotifications: (message: WS_NewNotificationsResponse) => void;
    unreadCount: (message: WS_UnreadCountResponse) => void;
    userPreferences: (message: WS_UserPreferencesResponse) => void;
  };

  destroy = (): void => {
    this.websocket?.close();
    Object.values(this.elements).map((e) => {
      e && e.remove();
    });
  };

  constructor(options: InitOptions) {
    this.elements = {};
    this.state = {
      initOptions: options,
      lastNotificationsRequestAt: 0,
      notifications: [],
      unread: 0,
      oldestNotificationsDate: '',
      currentPage: 0,
      pageSize: 999999,
      restBaseURL: options.restBaseURL ?? defaultRestAPIUrl
    };
    const translationsObject: TranslationObject =
      supportedLanguages.reduce<TranslationObject>((acc, language) => {
        acc[language] = {
          translation: supportedLanguagesFile[language]
        };
        return acc;
      }, {} as TranslationObject);
    i18n.init({
      resources: translationsObject,
      lng: this.state.initOptions.language,
      fallbackLng: 'en-US'
    });

    this.websocketHandlers = {
      notifications: (message: WS_NotificationsResponse) => {
        const notifications = message.payload.notifications;
        this.state.lastResponseNotificationsCount = notifications.length;

        if (this.elements.notificationsLoading) {
          this.elements.notificationsLoading.remove();
          delete this.elements.notificationsLoading;
        }

        this.addNotificationsToState(notifications);

        if (
          notifications.length < NOTIFICATION_REQUEST_COUNT &&
          !this.elements.empty &&
          this.elements.popupInner
        ) {
          if (this.state.inappOptions && !this.state.inappOptions.paginated) {
            const noMore = document.createElement('div');
            noMore.innerHTML = i18n.t('no_more_notifications');
            noMore.classList.add('notificationapi-nomore');
            this.elements.popupInner.append(noMore);
          }
        }

        this.renderNotifications();
      },
      newNotifications: (message: WS_NewNotificationsResponse) => {
        const beforeCount = this.state.notifications.length;

        if (this.elements.notificationsLoading) {
          this.elements.notificationsLoading.remove();
          delete this.elements.notificationsLoading;
        }

        this.addNotificationsToState(message.payload.notifications);
        this.renderNotifications();
        const afterCount = this.state.notifications.length;
        this.setInAppUnread(this.state.unread + afterCount - beforeCount);
      },
      unreadCount: (message: WS_UnreadCountResponse) => {
        this.setInAppUnread(message.payload.count);
      },
      userPreferences: (message: WS_UserPreferencesResponse) => {
        if (this.elements.preferencesLoading) {
          this.elements.preferencesLoading.remove();
          delete this.elements.preferencesLoading;
        }

        this.renderPreferences(message.payload.userPreferences);
      }
    };

    // validations
    if (!options.clientId || options.clientId === 'undefined') {
      console.error('Invalid clientId.');
      return;
    }

    if (!options.userId || options.userId === 'undefined') {
      console.error('Invalid userId.');
      return;
    }

    // connect to WS
    if (options.websocket !== false) {
      const websocketAddress = `${
        options.websocket ?? defaultWebSocket
      }?envId=${encodeURIComponent(
        options.clientId
      )}&userId=${encodeURIComponent(options.userId)}${
        options.userIdHash
          ? '&userIdHash=' + encodeURIComponent(options.userIdHash)
          : ''
      }`;
      this.websocket = new WebSocket(websocketAddress);
    }
  }

  identify = async (user: UserParams): Promise<void> => {
    const { clientId, userId, userIdHash } = this.state.initOptions;
    if (user.id && user.id !== userId) {
      console.error(
        `The userId "${user.id}" does not match the userId "${userId}" provided in the init options. Cancelling action to prevent mistakes.`
      );
      return;
    }
    const url = `${this.state.restBaseURL}/${encodeURIComponent(
      clientId
    )}/users/${encodeURIComponent(userId)}`;

    const authToken =
      'Basic ' + btoa(`${clientId}:${userId}:${userIdHash ?? ''}`);

    await fetch(url, {
      body: JSON.stringify(user),
      headers: {
        'content-type': 'application/json',
        Authorization: authToken
      },
      method: 'POST'
    });
  };

  showInApp = (options: InAppOptions): void => {
    this.state.inappOptions = options;

    // validation
    const root = document.getElementById(options.root);
    if (!root) {
      console.error(
        `There are no HTML elements with id="${options.root}" on the page.`
      );
      return;
    }
    this.elements.root = root;

    if (
      options.popupPosition &&
      !Object.values(PopupPosition).includes(options.popupPosition)
    ) {
      console.error(
        `"${
          options.popupPosition
        }" is not a valid position. Valid positions: ${Object.values(
          PopupPosition
        ).join(', ')}`
      );
      return;
    }

    // clean existing
    if (root.hasChildNodes()) {
      root.innerHTML = '';
    }

    // render top level container
    const container = document.createElement('div');
    container.classList.add('notificationapi-container');
    root.appendChild(container);

    // render popup & button & unread badge
    this.elements.popup = document.createElement('div');
    const popup = this.elements.popup;
    popup.classList.add('notificationapi-popup');
    if (options.inline) {
      popup.classList.add('inline');
    } else {
      popup.classList.add('popup');
      popup.classList.add('hovering');
      popup.classList.add('closed');

      // button
      const button = document.createElement('button');
      button.classList.add('notificationapi-button');
      button.innerHTML = `<span class="icon-bell-o"></span>`;
      container.appendChild(button);
      button.onclick = () => {
        if (popup.classList.contains('closed')) {
          this.openInAppPopup();
        } else {
          this.closeInAppPopup();
        }
      };
      this.elements.button = button;

      window.addEventListener('click', (e) => {
        const clickedPopup =
          (e.target as Element).closest('.notificationapi-popup') ?? false;
        const clickedButton =
          (e.target as Element).closest('.notificationapi-button') ?? false;
        const clickedPreferences =
          (e.target as Element).closest(
            '.notificationapi-preferences-container'
          ) ?? false;

        if (
          !clickedButton &&
          !clickedPopup &&
          !clickedPreferences &&
          !this.elements.notificationMenu
        ) {
          popup.classList.add('closed');
        }
      });

      // unread badge
      const unread = document.createElement('div');
      unread.classList.add('notificationapi-unread');
      button.appendChild(unread);
      this.elements.unread = unread;
      this.setInAppUnread(this.state.unread);
    }
    container.appendChild(popup);

    // close notification menu
    window.addEventListener('click', (e) => {
      const clickedNotificationMenuButton =
        (e.target as Element).closest(
          '.notificationapi-notification-menu-button'
        ) ?? false;
      if (!clickedNotificationMenuButton && this.elements.notificationMenu) {
        this.elements.notificationMenu.remove();
        this.elements.notificationMenu = undefined;
      }
    });

    // render popup inner container
    this.elements.popupInner = document.createElement('div');
    const popupInner = this.elements.popupInner;
    popupInner.classList.add('notificationapi-popup-inner');
    popup.appendChild(popupInner);
    this.elements.popupInner = popupInner;

    // render header
    this.elements.header = document.createElement('div');

    const headerCloseButton = document.createElement('button');
    headerCloseButton.classList.add('notificationapi-close-button');
    headerCloseButton.addEventListener('click', () => {
      this.closeInAppPopup();
    });
    this.elements.header.appendChild(headerCloseButton);
    const headerHeading = document.createElement('h1');
    headerHeading.innerHTML = i18n.t('notifications');
    this.elements.header.appendChild(headerHeading);

    const headerPreferencesButton = document.createElement('button');
    headerPreferencesButton.classList.add('notificationapi-preferences-button');
    headerPreferencesButton.innerHTML = '<span class="icon-cog"></span>';
    headerPreferencesButton.title = i18n.t('notification_settings');
    headerPreferencesButton.addEventListener('click', () => {
      this.showUserPreferences();
    });
    this.elements.header.appendChild(headerPreferencesButton);

    if (
      options.markAsReadMode &&
      options.markAsReadMode !== MarkAsReadModes.AUTOMATIC
    ) {
      const headerReadAllButton = document.createElement('button');
      headerReadAllButton.classList.add('notificationapi-readAll-button');
      headerReadAllButton.innerHTML = '<span class="icon-check"></span>';
      headerReadAllButton.title = i18n.t('mark_all_as_read');
      headerReadAllButton.addEventListener('click', () => {
        this.readAll();
      });
      this.elements.header.appendChild(headerReadAllButton);
    }

    this.elements.header.classList.add('notificationapi-header');
    popupInner.appendChild(this.elements.header);

    // render default loading state
    const loading = document.createElement('div');
    loading.classList.add('notificationapi-loading');
    const icon = document.createElement('span');
    icon.classList.add('icon-spinner8', 'spinner');
    loading.appendChild(icon);
    popupInner.appendChild(loading);
    this.elements.notificationsLoading = loading;

    // render footer
    this.elements.footer = document.createElement('div');

    if (options.paginated) {
      this.state.pageSize = options.pageSize ?? PAGE_SIZE;

      // footer prev button
      const prevButton = document.createElement('button');
      prevButton.classList.add('notificationapi-prev-button');
      prevButton.innerHTML = '<';
      prevButton.disabled = true;
      prevButton.addEventListener('click', () => {
        this.changePage(this.state.currentPage - 1);
      });
      this.elements.prevButton = prevButton;

      // footer next button
      const nextButton = document.createElement('button');
      nextButton.classList.add('notificationapi-next-button');
      nextButton.innerHTML = '>';
      nextButton.disabled = true;
      nextButton.addEventListener('click', () => {
        this.changePage(this.state.currentPage + 1);
      });
      this.elements.nextButton = nextButton;

      this.elements.footer.appendChild(prevButton);
      this.elements.footer.appendChild(nextButton);
    }

    this.elements.footer.classList.add('notificationapi-footer');
    popupInner.appendChild(this.elements.footer);

    this.addNotificationsToState(this.state.notifications);

    if (!options.paginated) {
      popupInner.onscroll = () => {
        if (
          popupInner.scrollTop + popupInner.clientHeight >=
          popupInner.scrollHeight - 100 // 100px before the end
        ) {
          this.requestMoreNotifications();
        }
      };
    }

    // use WS for inapp
    this.sendWSMessage({
      route: 'inapp_web/unread_count'
    });
    this.sendWSMessage({
      route: 'inapp_web/notifications',
      payload: {
        count: NOTIFICATION_REQUEST_COUNT
      }
    });

    if (this.websocket) {
      const ws = this.websocket;
      ws.addEventListener('message', (m: MessageEvent) => {
        const body = JSON.parse(m.data);

        if (!body || !body.route) {
          return;
        }

        if (body.route === 'inapp_web/unread_count') {
          const message = body as WS_UnreadCountResponse;
          this.websocketHandlers.unreadCount(message);
        }

        if (body.route === 'inapp_web/notifications') {
          const message = body as WS_NotificationsResponse;
          this.websocketHandlers.notifications(message);
        }

        if (body.route === 'inapp_web/new_notifications') {
          const message = body as WS_NewNotificationsResponse;
          this.websocketHandlers.newNotifications(message);
        }
      });
    }
  };

  requestMoreNotifications(): void {
    if (
      this.websocket &&
      new Date().getTime() - this.state.lastNotificationsRequestAt >= 500 &&
      (this.state.lastResponseNotificationsCount === undefined ||
        this.state.lastResponseNotificationsCount >= NOTIFICATION_REQUEST_COUNT)
    ) {
      this.state.lastNotificationsRequestAt = new Date().getTime();
      const moreNotificationsRequest: WS_NotificationsRequest = {
        route: 'inapp_web/notifications',
        payload: {
          before: this.state.oldestNotificationsDate,
          count: NOTIFICATION_REQUEST_COUNT
        }
      };
      this.sendWSMessage(moreNotificationsRequest);
    }
  }

  showUserPreferences(options?: UserPreferencesOptions): void {
    if (!this.elements.preferencesContainer) {
      // create container
      let root: HTMLElement = document.getElementsByTagName('body')[0];
      if (options?.parent) {
        const parentElement = document.getElementById(options.parent);
        if (!parentElement) {
          console.error(
            `There are no HTML elements with id="${options.parent}" on the page.`
          );
        } else {
          root = parentElement;
        }
      }
      const container = document.createElement('div');
      container.classList.add('notificationapi-preferences-container');
      if (options?.parent) container.classList.add('inline');
      this.elements.preferencesContainer = container;
      root.appendChild(container);

      // create backdrop
      const backdrop = document.createElement('div');
      backdrop.classList.add('notificationapi-preferences-backdrop');
      backdrop.addEventListener('click', () => {
        container.classList.add('closed');
      });
      container.appendChild(backdrop);

      // create popup
      const popup = document.createElement('div');
      popup.classList.add('notificationapi-preferences-popup');
      container.appendChild(popup);
      this.elements.preferencesPopup = popup;

      // create close button
      const close = document.createElement('button');
      close.classList.add('notificationapi-preferences-close');
      close.addEventListener('click', () => {
        container.classList.add('closed');
      });
      popup.appendChild(close);

      // create title
      const title = document.createElement('h1');
      title.innerHTML = i18n.t('notification_preferences');
      popup.appendChild(title);
      // render loading state
      const loading = document.createElement('div');
      loading.classList.add('notificationapi-loading');
      const icon = document.createElement('span');
      icon.classList.add('icon-spinner8', 'spinner');
      loading.appendChild(icon);
      popup.appendChild(loading);
      this.elements.preferencesLoading = loading;

      if (this.websocket) {
        const ws = this.websocket;
        ws.addEventListener('message', (m) => {
          const body = JSON.parse(m.data);

          if (!body || !body.route) {
            return;
          }
          if (body.route === 'user_preferences/preferences') {
            const message = body as WS_UserPreferencesResponse;
            this.websocketHandlers.userPreferences(message);
          }
        });
      }
    } else {
      this.elements.preferencesContainer.classList.remove('closed');
    }

    // Request user preferences every time render is run to get the latest
    this.sendWSMessage({
      route: 'user_preferences/get_preferences'
    });
  }

  async getUserPreferences(): Promise<Preference[]> {
    this.sendWSMessage({
      route: 'user_preferences/get_preferences'
    });
    const message = (await this.websocketMessageReceived(
      'user_preferences/preferences'
    )) as WS_UserPreferencesResponse;
    return message.payload.userPreferences;
  }

  patchUserPreference(
    notificationId: string,
    channel: string,
    state: boolean,
    subNotificationId?: string
  ): void {
    const message: WS_UserPreferencesPatchRequest = {
      route: 'user_preferences/patch_preferences',
      payload: [
        {
          notificationId,
          channelPreferences: [
            {
              channel,
              state: state
            }
          ]
        }
      ]
    };
    if (subNotificationId) {
      message.payload[0].subNotificationId = subNotificationId;
    }
    this.sendWSMessage(message);
  }

  openInAppPopup(): void {
    if (
      this.elements.popup &&
      this.elements.popupInner &&
      this.elements.button &&
      this.state.inappOptions &&
      !this.state.inappOptions.inline
    ) {
      position(
        this.elements.popup,
        this.elements.popupInner,
        this.elements.button,
        this.state.inappOptions.popupPosition ?? PopupPosition.RightBottom
      );
      this.elements.popup.classList.remove('closed');

      if (
        !this.state.inappOptions.markAsReadMode ||
        this.state.inappOptions.markAsReadMode === MarkAsReadModes.AUTOMATIC
      ) {
        this.readAll();
      }
    }
  }

  readAll(): void {
    this.setInAppUnread(0);
    this.state.notifications.map((n) => {
      n.seen = true;
    });
    this.sendWSMessage({
      route: 'inapp_web/unread_clear'
    });

    // In AUTOMATIC mode, don't remove the unseen class so users can differentiate what's new and what's old
    if (
      this.state.inappOptions &&
      this.state.inappOptions.markAsReadMode &&
      this.state.inappOptions.markAsReadMode !== MarkAsReadModes.AUTOMATIC &&
      this.elements.popupInner
    ) {
      this.elements.popupInner.querySelectorAll('.unseen').forEach((e) => {
        e.classList.remove('unseen');
      });
    }
  }

  closeInAppPopup(): void {
    if (
      this.elements.popup &&
      this.state.inappOptions &&
      !this.state.inappOptions.inline
    ) {
      this.elements.popup.classList.add('closed');
    }
  }

  setInAppUnread(count: number): void {
    this.state.unread = count;
    if (
      this.elements.unread &&
      this.state.inappOptions &&
      !this.state.inappOptions.inline
    ) {
      if (count === 0) {
        this.elements.unread.classList.add('hidden');
      } else {
        this.elements.unread.classList.remove('hidden');
      }

      if (count < 100) {
        this.elements.unread.innerHTML = count + '';
      } else {
        this.elements.unread.innerHTML = '+99';
      }
    }
  }

  addNotificationsToState(notifications: InappNotification[]): void {
    // filter existing
    const newNotifications = notifications.filter((n) => {
      const found = this.state.notifications.find((existingN) => {
        return existingN.id === n.id;
      });
      return found ? false : true;
    });

    this.state.notifications =
      this.state.notifications.concat(newNotifications);

    this.state.notifications.sort((a, b) => {
      return Date.parse(b.date) - Date.parse(a.date);
    });

    // set the oldest fetched notification date
    if (this.state.notifications.length > 0)
      this.state.oldestNotificationsDate =
        this.state.notifications[this.state.notifications.length - 1].date;

    if (
      this.state.notifications.length === 0 &&
      !this.elements.empty &&
      !this.elements.notificationsLoading &&
      this.elements.header
    ) {
      const empty = document.createElement('div');
      empty.classList.add('notificationapi-empty');
      empty.innerHTML = i18n.t('no_notifications');
      this.elements.header.after(empty);
      this.elements.empty = empty;
    }

    if (newNotifications.length > 0 && this.elements.empty) {
      this.elements.empty.remove();
      delete this.elements.empty;
    }
  }

  getPageCount(): number {
    return Math.max(
      1,
      Math.ceil(this.state.notifications.length / this.state.pageSize)
    );
  }

  changePage(pageNumber: number): void {
    this.state.currentPage = pageNumber;

    if (this.state.currentPage >= this.getPageCount() - 2) {
      this.requestMoreNotifications();
    }

    this.renderNotifications();
  }

  /*
    renders the given range of state.notifications
  */
  renderNotifications(): void {
    const header = this.elements.header;
    const popupInner = this.elements.popupInner;
    if (!header || !popupInner || !this.state.inappOptions) return;

    const page = this.state.currentPage;
    const pageSize = this.state.pageSize;

    if (this.state.inappOptions.paginated) {
      popupInner
        .querySelectorAll('.notificationapi-notification')
        .forEach((el) => {
          el.remove();
        });
    }

    for (
      let i = page * pageSize;
      i < this.state.notifications.length && i < page * pageSize + pageSize;
      i++
    ) {
      const n = this.state.notifications[i];

      // ignore if already rendered
      if (popupInner.querySelector(`[data-notification-id="${n.id}"]`)) {
        continue;
      }

      const el = this.generateNotificationElement(n);

      if (i === page * pageSize) {
        header.insertAdjacentElement('afterend', el);
      } else {
        const preNotificationEl = popupInner.querySelector(
          `[data-notification-id="${this.state.notifications[i - 1].id}"]`
        );
        // ignoring the else statement coverage: unknown scenario.
        /* istanbul ignore next */
        if (preNotificationEl) {
          preNotificationEl.insertAdjacentElement('afterend', el);
        } else {
          console.error(
            'error finding previous notification',
            this.state.notifications[i - 1]
          );
        }
      }
    }

    if (this.elements.prevButton) {
      this.elements.prevButton.disabled = page === 0;
    }

    if (this.elements.nextButton) {
      this.elements.nextButton.disabled =
        page >= this.state.notifications.length / pageSize - 1;
    }
  }

  generateNotificationElement(n: InappNotification): HTMLAnchorElement {
    const notification = document.createElement('a');
    notification.setAttribute('data-notification-id', n.id);
    notification.classList.add('notificationapi-notification');

    if (n.redirectURL) {
      notification.href = n.redirectURL;
    }

    const notificationImageContainer = document.createElement('div');
    notificationImageContainer.classList.add(
      'notificationapi-notification-imageContainer'
    );
    if (n.imageURL) {
      const notificationImage = document.createElement('img');
      notificationImage.classList.add('notificationapi-notification-image');
      notificationImage.src = n.imageURL;
      notificationImageContainer.appendChild(notificationImage);
    } else {
      const notificationIcon = document.createElement('span');
      notificationIcon.classList.add('icon-commenting-o');
      notificationIcon.classList.add(
        'notificationapi-notification-defaultIcon'
      );
      notificationImageContainer.appendChild(notificationIcon);
    }
    notification.appendChild(notificationImageContainer);

    const notificationMetaContainer = document.createElement('div');
    notificationMetaContainer.classList.add(
      'notificationapi-notification-metaContainer'
    );

    const notificationTitle = document.createElement('p');
    notificationTitle.classList.add('notificationapi-notification-title');
    notificationTitle.innerHTML = n.title;
    notificationMetaContainer.appendChild(notificationTitle);

    const date = document.createElement('p');
    date.classList.add('notificationapi-notification-date');
    date.innerHTML = timeAgo(Date.now() - new Date(n.date).getTime(), i18n);

    notificationMetaContainer.appendChild(date);

    notification.appendChild(notificationMetaContainer);

    if (!n.seen) {
      notification.classList.add('unseen');
    }

    // notification menu button
    if (
      this.state.inappOptions &&
      this.state.inappOptions.markAsReadMode &&
      this.state.inappOptions.markAsReadMode !== MarkAsReadModes.AUTOMATIC
    ) {
      const menuButton = document.createElement('button');
      menuButton.classList.add('notificationapi-notification-menu-button');
      menuButton.innerHTML = '<span class="icon-ellipsis-h"></span>';
      menuButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.elements.notificationMenu?.remove();
        const menu = document.createElement('div');
        menu.classList.add('notificationapi-notification-menu');
        const item = document.createElement('button');
        item.classList.add('notificationapi-notification-menu-item');
        item.innerHTML = `<span class="icon-check"></span><span class="notificationapi-notification-menu-item-text">${i18n.t(
          'mark_as_read'
        )}</span>`;
        item.addEventListener('click', (e) => {
          e.preventDefault();
          notification.classList.remove('unseen');
          this.setInAppUnread(this.state.unread - 1);
          this.sendWSMessage({
            route: 'inapp_web/unread_clear',
            payload: {
              notificationId: n.id
            }
          });
        });
        menu.appendChild(item);
        notification.appendChild(menu);
        this.elements.notificationMenu = menu;
      });
      notification.appendChild(menuButton);
    }

    if (
      this.state.inappOptions &&
      this.state.inappOptions.markAsReadMode ===
        MarkAsReadModes.MANUAL_AND_CLICK
    ) {
      notification.addEventListener('click', (e) => {
        const element = e.target as HTMLElement;
        const menuWasClicked =
          element.classList.contains(
            'notificationapi-notification-menu-button'
          ) ||
          element.classList.contains('notificationapi-notification-menu') ||
          element.closest('.notificationapi-notification-menu-button') ||
          element.closest('.notificationapi-notification-menu');

        if (!menuWasClicked && !n.seen) {
          notification.classList.remove('unseen');
          n.seen = true;
          this.setInAppUnread(this.state.unread - 1);
          this.sendWSMessage({
            route: 'inapp_web/unread_clear',
            payload: {
              notificationId: n.id
            }
          });
        }
      });
    }

    return notification;
  }

  renderPreferences(preferences: Preference[]): void {
    if (!this.elements.preferencesPopup) return;

    const popup = this.elements.preferencesPopup;
    const withoutWebPush = preferences.map((p) => ({
      ...p,
      settings: p.settings.filter((s) => s.channel !== 'WEB_PUSH'),
      subNotificationPreferences: p.subNotificationPreferences?.map((sub) => ({
        ...sub,
        settings: sub.settings.filter((s) => s.channel !== 'WEB_PUSH')
      }))
    }));
    const validPreferences = withoutWebPush.filter(
      (p) => p.settings.length > 0
    );
    if (validPreferences.length === 0 && !this.elements.preferencesEmpty) {
      const empty = document.createElement('div');
      empty.classList.add('notificationapi-preferences-empty');
      empty.innerHTML = i18n.t('there_are_no_notifications_to_configure');
      popup.appendChild(empty);
      this.elements.preferencesEmpty = empty;
      return;
    }

    // render grid
    this.elements.preferencesGrid?.remove();
    this.elements.preferencesGrid = undefined;
    const grid = document.createElement('div');
    grid.classList.add('notificationapi-preferences-grid');
    this.elements.preferencesGrid = grid;
    popup.appendChild(grid);

    const channels: Record<string, string> = {};
    validPreferences.map((p) => {
      p.settings.map((s) => {
        if (!channels[s.channel]) channels[s.channel] = s.channelName;
      });
    });

    let row = 1;
    Object.values(channels).map((v, i) => {
      const channel = document.createElement('div');
      channel.innerHTML = v;
      channel.classList.add(
        'notificationapi-preferences-channel',
        `notificationapi-preferences-col${i + 2}`,
        `notificationapi-preferences-row${row}`
      );
      grid.appendChild(channel);
    });
    row++;

    // render preference rows

    validPreferences.map((pref) => {
      const title = document.createElement('div');
      title.classList.add(
        'notificationapi-preferences-title',
        'notificationapi-preferences-col1',
        `notificationapi-preferences-row${row}`
      );
      title.innerHTML = pref.title;
      grid.appendChild(title);
      pref.settings.map((s) => {
        const toggle = document.createElement('div');
        const col = Object.keys(channels).indexOf(s.channel) + 2;
        toggle.classList.add(
          'notificationapi-preferences-toggle',
          `notificationapi-preferences-col${col}`,
          `notificationapi-preferences-row${row}`
        );
        toggle.setAttribute('data-notificationId', pref.notificationId);
        toggle.setAttribute('data-channel', s.channel);

        const label = document.createElement('label');
        label.classList.add('switch');
        toggle.appendChild(label);

        const input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.checked = s.state;
        label.appendChild(input);
        const i = document.createElement('i');
        label.appendChild(i);

        input.addEventListener('change', () => {
          grid
            .querySelectorAll(
              `.notificationapi-preferences-subtoggle[data-notificationid="${pref.notificationId}"][data-channel="${s.channel}"] input`
            )
            .forEach((e) => {
              (e as HTMLInputElement).disabled = !input.checked;
            });
          this.patchUserPreference(
            pref.notificationId,
            s.channel,
            input.checked
          );
        });
        grid.appendChild(toggle);
      });

      row++;
      if (
        pref.subNotificationPreferences &&
        pref.subNotificationPreferences.length > 0
      ) {
        const expand = document.createElement('button');
        expand.innerHTML = i18n.t('expand');
        expand.setAttribute('data-notificationId', pref.notificationId);
        const col = Object.keys(channels).length + 2;
        expand.classList.add(
          'notificationapi-preferences-expand',
          `notificationapi-preferences-col${col}`,
          `notificationapi-preferences-row${row - 1}`
        );
        expand.addEventListener('click', (e) => {
          const expand = e.target as HTMLButtonElement;
          const notificationId = expand.getAttribute('data-notificationId');
          popup
            .querySelectorAll(
              `[data-notificationId="${notificationId}"][data-subNotificationId]`
            )
            .forEach((e) => {
              e.classList.toggle('closed');
            });
        });
        grid.appendChild(expand);

        pref.subNotificationPreferences.map((subPref) => {
          const title = document.createElement('div');
          title.classList.add(
            'notificationapi-preferences-subtitle',
            'notificationapi-preferences-col1',
            `notificationapi-preferences-row${row}`,
            'closed'
          );
          title.setAttribute(
            'data-subNotificationId',
            subPref.subNotificationId
          );

          title.setAttribute('data-notificationId', pref.notificationId);
          title.innerHTML = subPref.title;
          grid.appendChild(title);
          subPref.settings.map((s) => {
            const toggle = document.createElement('div');
            const col = Object.keys(channels).indexOf(s.channel) + 2;
            toggle.classList.add(
              'notificationapi-preferences-subtoggle',
              `notificationapi-preferences-col${col}`,
              `notificationapi-preferences-row${row}`,
              'closed'
            );
            toggle.setAttribute('data-notificationId', subPref.notificationId);
            toggle.setAttribute(
              'data-subNotificationId',
              subPref.subNotificationId
            );
            toggle.setAttribute('data-channel', s.channel);

            const label = document.createElement('label');
            label.classList.add('switch', 'small');
            toggle.appendChild(label);

            const input = document.createElement('input');
            input.setAttribute('type', 'checkbox');
            input.checked = s.state;
            if (
              pref.settings.find(
                (ps) => ps.channel === s.channel && ps.state === false
              )
            )
              input.disabled = true;
            label.appendChild(input);
            const i = document.createElement('i');
            label.appendChild(i);

            input.addEventListener('change', () => {
              this.patchUserPreference(
                pref.notificationId,
                s.channel,
                input.checked,
                subPref.subNotificationId
              );
            });
            grid.appendChild(toggle);
          });
          row++;
        });
      }
    });
  }

  sendWSMessage(request: WS_ANY_VALID_REQUEST): void {
    if (!this.websocket) return;
    const ws = this.websocket;
    if (ws.readyState == ws.OPEN) {
      ws.send(JSON.stringify(request));
    } else {
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify(request));
      });
    }
  }

  async websocketMessageReceived(route: string): Promise<unknown> {
    const ws = await this.websocketOpened();
    return new Promise((resolve) => {
      ws.addEventListener('message', (message) => {
        const body = JSON.parse(message.data);
        if (body && body.route && body.route === route) {
          resolve(body);
        }
      });
    });
  }

  websocketOpened(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = this.websocket;
      if (!ws) {
        reject('Websocket is not present.');
        return;
      }

      const checkState = () => {
        if (ws.readyState === ws.OPEN) {
          resolve(ws);
        } else if (
          ws.readyState === ws.CLOSED ||
          ws.readyState === ws.CLOSING
        ) {
          reject('Websocket failed to open.');
        } else {
          setTimeout(checkState, 100); // Check again in 100ms
        }
      };

      checkState();
    });
  }
}

export default NotificationAPIClient;
