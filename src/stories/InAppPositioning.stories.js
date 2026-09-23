import NotificationAPI from '../index';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import '../assets/styles.css';
import { generateFakeNotifications } from './FakeNotificationGenerator';
export default {
  title: 'InApp/Positioning',
  parameters: {
    viewport: {
      options: INITIAL_VIEWPORTS
    },
    layout: 'centered'
  },
  argTypes: {
    position: {
      control: {
        type: 'select',
        options: [
          'topLeft',
          'topRight',
          'leftTop',
          'leftBottom',
          'bottomLeft',
          'bottomRight',
          'rightTop',
          'rightBottom'
        ]
      }
    }
  }
};

const Template2 = ({ ...args }) => {
  Object.assign(window, { NotificationAPI });
  return `<div id="our-root"></div>
          <BR><BR>

          <script>
            notificationapi = new NotificationAPI({
              mock: true
            });
            notificationapi.showInApp({
              root: "our-root",
              popupPosition: "${args.position ?? 'topLeft'}"
            })
            notificationapi.websocketHandlers.notifications(${JSON.stringify(
              args.wsNotificationsResponse
            )})
            notificationapi.openInAppPopup();
          </script>
`;
};

export const PopupDirection = Template2.bind({});
PopupDirection.args = {
  wsNotificationsResponse: {
    route: 'inapp_web/notifications',
    payload: {
      notifications: generateFakeNotifications(100)
    }
  }
};

export const MobilePopupDirection = Template2.bind({});
MobilePopupDirection.parameters = {
  viewport: {
    defaultViewport: 'iphone12promax'
  }
};
