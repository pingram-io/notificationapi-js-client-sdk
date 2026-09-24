import NotificationAPI from '../index';

export default {
  title: 'User Preferences - Inline'
};

const Component = ({ ...args }) => {
  Object.assign(window, { NotificationAPI });
  let page = `Just some random text on the page to see the blur effect.
          <BR><BR>
          <div id="parentDiv"></div>
          <script>
            if(window.notificationapi) notificationapi.destroy();
            window.notificationapi = new NotificationAPI(${JSON.stringify(
              args.initOptions
            )});
            window.notificationapi.showUserPreferences({ parent: 'parentDiv' });
            if(${args.wsUserPreferencesResponse ? 'true' : 'false'})
              window.notificationapi.websocketHandlers.userPreferences(${JSON.stringify(
                args.wsUserPreferencesResponse
              )});
          </script>`;

  return page;
};

const clientId = 'test';
const userId = 'test';
export const LoadingState = Component.bind({});
LoadingState.args = {
  initOptions: {
    clientId,
    userId,
    websocket: 'ws://localhost'
  }
};

export const EmptyState = Component.bind({});
EmptyState.args = {
  initOptions: {
    clientId,
    userId,
    websocket: 'ws://localhost'
  },
  wsUserPreferencesResponse: {
    route: 'user_preferences/preferences',
    payload: {
      userPreferences: []
    }
  }
};

export const SimpleState = Component.bind({});
SimpleState.args = {
  initOptions: {
    clientId,
    userId,
    websocket: 'ws://localhost'
  },
  wsUserPreferencesResponse: {
    route: 'user_preferences/preferences',
    payload: {
      userPreferences: [
        {
          notificationId: 'notificationId1',
          title: 'Welcome Notification',
          settings: [
            {
              channel: 'EMAIL',
              channelName: 'Email',
              state: true
            }
          ]
        }
      ]
    }
  }
};

export const ComplexPreferenceState = Component.bind({});
ComplexPreferenceState.args = {
  initOptions: {
    clientId,
    userId,
    websocket: 'ws://localhost'
  },
  wsUserPreferencesResponse: {
    route: 'user_preferences/preferences',
    payload: {
      userPreferences: [
        {
          notificationId: 'notificationId1',
          title: 'Welcome Notification',
          settings: [
            {
              channel: 'EMAIL',
              channelName: 'Email',
              state: true
            },
            {
              channel: 'INAPP_WEB',
              channelName: 'In-App',
              state: false
            }
          ]
        },
        {
          notificationId: 'notificationId2',
          title: 'New account created',
          settings: [
            {
              channel: 'EMAIL',
              channelName: 'Email',
              state: false
            },
            {
              channel: 'SMS',
              channelName: 'SMS',
              state: true
            }
          ]
        },
        {
          notificationId: 'notificationId3',
          title: 'Reminders',
          settings: [
            {
              channel: 'EMAIL',
              channelName: 'Email',
              state: true
            },
            {
              channel: 'INAPP_WEB',
              channelName: 'In-App',
              state: true
            }
          ],
          subNotificationPreferences: [
            {
              notificationId: 'notificationId3',
              subNotificationId: 'subNotificationId1',
              title: 'Monthly Reminder',
              settings: [
                {
                  channel: 'EMAIL',
                  channelName: 'Email',
                  state: true
                },
                {
                  channel: 'INAPP_WEB',
                  channelName: 'In-App',
                  state: false
                }
              ]
            },
            {
              notificationId: 'notificationId3',
              subNotificationId: 'subNotificationId2',
              title: 'Weekly Reminder',
              settings: [
                {
                  channel: 'EMAIL',
                  channelName: 'Email',
                  state: false
                },
                {
                  channel: 'INAPP_WEB',
                  channelName: 'In-App',
                  state: true
                }
              ]
            }
          ]
        },
        {
          notificationId: 'notificationId4',
          title: 'Threshold Passed Very Looong Loooooong Tet',
          settings: [
            {
              channel: 'EMAIL',
              channelName: 'Email',
              state: true
            },
            {
              channel: 'INAPP_WEB',
              channelName: 'In-App',
              state: true
            }
          ],
          subNotificationPreferences: [
            {
              notificationId: 'notificationId4',
              subNotificationId: 'subNotificationId1',
              title: 'Threshold > 100',
              settings: [
                {
                  channel: 'EMAIL',
                  channelName: 'Email',
                  state: true
                },
                {
                  channel: 'INAPP_WEB',
                  channelName: 'In-App',
                  state: false
                }
              ]
            },
            {
              notificationId: 'notificationId4',
              subNotificationId: 'subNotificationId2',
              title: 'Threshold > Very loong loooong loooooong text',
              settings: [
                {
                  channel: 'EMAIL',
                  channelName: 'Email',
                  state: false
                },
                {
                  channel: 'INAPP_WEB',
                  channelName: 'In-App',
                  state: true
                }
              ]
            }
          ]
        }
      ]
    }
  }
};

export const Real = Component.bind({});
Real.args = {
  initOptions: {
    clientId: '54jas9ae4omlbbq3s0u0d9spui',
    userId: '123'
  }
};
