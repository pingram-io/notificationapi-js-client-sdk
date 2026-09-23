import NotificationAPI from '../index';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import '../assets/styles.css';
import { generateFakeNotifications } from './FakeNotificationGenerator';
export default {
  title: 'InApp/InlinePaginated',
  parameters: {
    viewport: {
      options: INITIAL_VIEWPORTS
    }
  }
};

const Template = ({ ...args }) => {
  Object.assign(window, { NotificationAPI });
  return `<div id="our-root" style="width: 500px; height: 700px"></div>
          <BR><BR>
          <script>
            notificationapi = new NotificationAPI(${JSON.stringify(
              args.initOptions
            )});
            notificationapi.showInApp(${JSON.stringify(args.inappOptions)})
            if(${args.wsNotificationsResponse ? 'true' : 'false'}) 
              notificationapi.websocketHandlers.notifications(${JSON.stringify(
                args.wsNotificationsResponse
              )});
          </script>
`;
};

const clientId = 'test';
const userId = 'test';

export const Loading = Template.bind({});
Loading.args = {
  initOptions: {
    clientId,
    userId,
    websocket: false
  },
  inappOptions: {
    root: 'our-root',
    inline: true,
    paginated: true
  }
};

export const Empty = Template.bind({});
Empty.args = {
  initOptions: {
    clientId,
    userId,
    websocket: false
  },
  inappOptions: {
    root: 'our-root',
    inline: true,
    paginated: true
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: []
    }
  }
};

export const Some = Template.bind({});
Some.args = {
  initOptions: {
    clientId,
    userId,
    websocket: false
  },
  inappOptions: {
    root: 'our-root',
    inline: true,
    paginated: true
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: generateFakeNotifications(3)
    }
  }
};

export const More = Template.bind({});
More.args = {
  initOptions: {
    clientId,
    userId,
    websocket: false
  },
  inappOptions: {
    root: 'our-root',
    inline: true,
    paginated: true
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: generateFakeNotifications(30)
    }
  }
};
