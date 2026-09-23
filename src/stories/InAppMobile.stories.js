import NotificationAPI from '../index';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import { generateFakeNotifications } from './FakeNotificationGenerator';
import '../assets/styles.css';

export default {
  title: 'InApp/Mobile',
  parameters: {
    viewport: {
      options: INITIAL_VIEWPORTS
    }
  }
};

const Template = ({ ...args }) => {
  Object.assign(window, { NotificationAPI });
  return `<div id="our-root"></div>
          <BR><BR>
          <script>
            notificationapi = new NotificationAPI(${JSON.stringify(
              args.initOptions
            )});
            notificationapi.showInApp(${JSON.stringify(args.inappOptions)})
            notificationapi.websocketHandlers.notifications(${JSON.stringify(
              args.wsNotificationsResponse
            )});
          </script>
`;
};

const clientId = 'test';
const userId = 'test';
export const MobilePopupEmpty = Template.bind({});
MobilePopupEmpty.args = {
  initOptions: {
    clientId,
    userId,
    websocket: false
  },
  inappOptions: {
    root: 'our-root'
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: { notifications: [] }
  }
};
MobilePopupEmpty.parameters = {
  viewport: {
    defaultViewport: 'iphone12promax'
  }
};

export const MobileFixedEmpty = Template.bind({});
MobileFixedEmpty.args = {
  initOptions: {
    clientId,
    userId,
    websocket: false
  },
  inappOptions: {
    root: 'our-root',
    inline: true
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: { notifications: [] }
  }
};
MobileFixedEmpty.parameters = {
  viewport: {
    defaultViewport: 'iphone12promax'
  }
};

export const MobilePopup = Template.bind({});
MobilePopup.args = {
  initOptions: {
    clientId,
    userId,
    websocket: false
  },
  inappOptions: {
    root: 'our-root'
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: { notifications: generateFakeNotifications(100) }
  }
};
MobilePopup.parameters = {
  viewport: {
    defaultViewport: 'iphone12promax'
  }
};

export const MobileFixed = Template.bind({});
MobileFixed.args = {
  initOptions: {
    clientId,
    userId,
    websocket: false
  },
  inappOptions: {
    root: 'our-root',
    inline: true
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: { notifications: generateFakeNotifications(100) }
  }
};
MobileFixed.parameters = {
  viewport: {
    defaultViewport: 'iphone12promax'
  }
};
