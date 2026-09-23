import NotificationAPI from '../index';
import '../assets/styles.css';
import { generateFakeNotifications } from './FakeNotificationGenerator';
import { MarkAsReadModes } from '../interfaces';

export default {
  title: 'InApp/ManualRead',
  argTypes: {
    manualMode: { control: 'select', options: ['MANUAL', 'MANUAL_AND_CLICK'] }
  }
};

const Component = ({ ...args }) => {
  Object.assign(window, { NotificationAPI });
  return `<div id="our-root"></div>
          <BR><BR>
          <script>
            notificationapi = new NotificationAPI(${JSON.stringify(args.init)});
            notificationapi.showInApp(${JSON.stringify({
              ...args.show,
              markAsReadMode: args.manualMode
            })});
            notificationapi.websocketHandlers.notifications(${JSON.stringify(
              args.wsNotificationsResponse
            )});
            notificationapi.websocketHandlers.unreadCount(${JSON.stringify(
              args.wsUnreadCountResponse
            )});
          </script>

`;
};

const clientId = 'test';
const userId = 'test';
export const Empty = Component.bind({});
Empty.args = {
  manualMode: 'MANUAL',
  init: {
    clientId,
    userId,
    websocket: false
  },
  show: {
    root: 'our-root',
    markAsReadMode: MarkAsReadModes.MANUAL
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: []
    }
  },
  wsUnreadCountResponse: {
    route: 'inapp_web/unread_count',
    payload: {
      count: 0
    }
  }
};

export const NoUnread = Component.bind({});
NoUnread.args = {
  manualMode: 'MANUAL',
  init: {
    clientId,
    userId,
    websocket: false
  },
  show: {
    root: 'our-root',
    markAsReadMode: MarkAsReadModes.MANUAL
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: generateFakeNotifications(50).map((n) => {
        return {
          ...n,
          seen: true
        };
      })
    }
  },
  wsUnreadCountResponse: {
    route: 'inapp_web/unread_count',
    payload: {
      count: 0
    }
  }
};

export const SomeUnread = Component.bind({});
SomeUnread.args = {
  manualMode: 'MANUAL',
  init: {
    clientId,
    userId,
    websocket: false
  },
  show: {
    root: 'our-root',
    markAsReadMode: MarkAsReadModes.MANUAL
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: generateFakeNotifications(50)
    }
  },
  wsUnreadCountResponse: {
    route: 'inapp_web/unread_count',
    payload: {
      count: 10
    }
  }
};

export const Inline = Component.bind({});
Inline.args = {
  manualMode: 'MANUAL',
  init: {
    clientId,
    userId,
    websocket: false
  },
  show: {
    root: 'our-root',
    markAsReadMode: MarkAsReadModes.MANUAL,
    inline: true
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: generateFakeNotifications(50)
    }
  },
  wsUnreadCountResponse: {
    route: 'inapp_web/unread_count',
    payload: {
      count: 10
    }
  }
};

export const Paginated = Component.bind({});
Paginated.args = {
  manualMode: 'MANUAL',
  init: {
    clientId,
    userId,
    websocket: false
  },
  show: {
    root: 'our-root',
    markAsReadMode: MarkAsReadModes.MANUAL,
    paginated: true
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: generateFakeNotifications(50)
    }
  },
  wsUnreadCountResponse: {
    route: 'inapp_web/unread_count',
    payload: {
      count: 10
    }
  }
};

export const InlinePaginated = Component.bind({});
InlinePaginated.args = {
  manualMode: 'MANUAL',
  init: {
    clientId,
    userId,
    websocket: false
  },
  show: {
    root: 'our-root',
    markAsReadMode: MarkAsReadModes.MANUAL,
    inline: true,
    paginated: true
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: generateFakeNotifications(50)
    }
  },
  wsUnreadCountResponse: {
    route: 'inapp_web/unread_count',
    payload: {
      count: 10
    }
  }
};
