import NotificationAPI from '../index';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import '../assets/styles.css';
import { generateFakeNotifications } from './FakeNotificationGenerator';

export default {
  title: 'InApp/LongPage',
  parameters: {
    viewport: {
      options: INITIAL_VIEWPORTS
    }
  }
};

const Template = ({ ...args }) => {
  Object.assign(window, { NotificationAPI });
  return `<div style="height: 1000px"></div>
          <div id="our-root"></div>
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

export const WithNotifications = Template.bind({});
WithNotifications.args = {
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
    payload: {
      notifications: generateFakeNotifications(20)
    }
  }
};
