import NotificationAPI from '../index';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import '../assets/styles.css';

export default {
  title: 'InApp/Default',
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
            notificationapi.showInApp(${JSON.stringify(args.inappOptions)});
            if(${args.wsNotificationsResponse ? 'true' : 'false'}) 
              notificationapi.websocketHandlers.notifications(${JSON.stringify(
                args.wsNotificationsResponse
              )});
          </script>
`;
};

let notifications = [
  {
    id: 1,
    seen: false,
    title: '<b>Moe</b> posted an update.',
    redirectURL: '#',
    imageURL: 'https://picsum.photos/200',
    date: new Date('2021-01-01')
  },
  {
    id: 2,
    seen: false,
    title: '<b>Maddie</b> added you to a <b>Startups</b> group.',
    redirectURL: '#',
    date: new Date('2021-03-01')
  },
  {
    id: 3,
    seen: false,
    title:
      '<b>Shannon</b> sent you a friend request. If you do not wish to receive more friends requests from this person, you can safely ignore this.',
    imageURL: 'https://picsum.photos/200',
    date: new Date()
  }
];

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
    root: 'our-root'
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
    root: 'our-root'
  },
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: []
    }
  }
};

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
      notifications
    }
  }
};
