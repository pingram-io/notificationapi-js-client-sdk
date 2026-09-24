import NotificationAPI from '../index';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import '../assets/styles.css';

export default {
  title: 'InApp/Real',
  parameters: {
    viewport: {
      options: INITIAL_VIEWPORTS
    }
  },
  argTypes: {
    markAsReadMode: {
      control: 'select',
      options: ['AUTOMATIC', 'MANUAL', 'MANUAL_AND_CLICK']
    }
  }
};

const Component = ({ ...args }) => {
  Object.assign(window, { NotificationAPI });
  return `<div id="our-root"></div>
          <BR><BR>
          <script>
            notificationapi = new NotificationAPI(${JSON.stringify(args)});
            notificationapi.showInApp({
              root: "our-root",
              popupPosition: "rightBottom",
              markAsReadMode: "${args.markAsReadMode}"});
          </script>

`;
};

export const WithNotifications = Component.bind({});
WithNotifications.args = {
  clientId: '54jas9ae4omlbbq3s0u0d9spui',
  userId: 'sahand',
  markAsReadMode: 'AUTOMATIC'
};

export const WithoutNotifications = Component.bind({});
WithoutNotifications.args = {
  clientId: '54jas9ae4omlbbq3s0u0d9spui',
  userId: 'thisiddoesnotexist',
  markAsReadMode: 'AUTOMATIC'
};

export const MobileWithNotifications = Component.bind({});
MobileWithNotifications.args = {
  clientId: '54jas9ae4omlbbq3s0u0d9spui',
  userId: 'sahand',
  markAsReadMode: 'AUTOMATIC'
};

MobileWithNotifications.parameters = {
  viewport: {
    defaultViewport: 'iphone12promax'
  }
};

export const MobileWithoutNotifications = Component.bind({});
MobileWithoutNotifications.args = {
  clientId: '54jas9ae4omlbbq3s0u0d9spui',
  userId: 'thisiddoesnotexist',
  markAsReadMode: 'AUTOMATIC'
};

MobileWithoutNotifications.parameters = {
  viewport: {
    defaultViewport: 'iphone12promax'
  }
};

export const SecureModeWrongHash = Component.bind({});
SecureModeWrongHash.args = {
  clientId: '54jas9ae4omlbbq3s0u0d9spui',
  userId: '1234',
  userIdHash: 'wronghash',
  markAsReadMode: 'AUTOMATIC'
};

export const SecureModeCorrectHash = Component.bind({});
SecureModeCorrectHash.args = {
  clientId: '54jas9ae4omlbbq3s0u0d9spui',
  userId: '1234',
  userIdHash: 'WFDdxv6xbyNTyIPu9AfmfogfdEHhuQ3/YXw7Rblkg2E=',
  markAsReadMode: 'AUTOMATIC'
};
