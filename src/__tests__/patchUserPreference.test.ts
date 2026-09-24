import {
  NotificationAPIClientInterface,
  WS_UserPreferencesPatchRequest
} from '../interfaces';
import WS from 'jest-websocket-mock';
import NotificationAPI from '../index';

const clientId = 'envId@';
const userId = 'userId@';

let spy: jest.SpyInstance;
let notificationapi: NotificationAPIClientInterface;
let server: WS;

beforeEach(() => {
  spy = jest.spyOn(console, 'error').mockImplementation();
  server = new WS('ws://localhost:1236', { jsonProtocol: true });
  notificationapi = new NotificationAPI({
    clientId,
    userId,
    websocket: 'ws://localhost:1236'
  });
});

afterEach(() => {
  WS.clean();
  spy.mockRestore();
  if (notificationapi) notificationapi.destroy();
});

test('sends a user_preferences/patch message', async () => {
  notificationapi.patchUserPreference('notificationId', 'channel', false);
  const request: WS_UserPreferencesPatchRequest = {
    route: 'user_preferences/patch_preferences',
    payload: [
      {
        notificationId: 'notificationId',
        channelPreferences: [
          {
            channel: 'channel',
            state: false
          }
        ]
      }
    ]
  };
  await expect(server).toReceiveMessage(request);
});

test('sends a user_preferences/patch message with subNotificationId', async () => {
  notificationapi.patchUserPreference(
    'notificationId',
    'channel',
    false,
    'subNotificationId'
  );
  const request: WS_UserPreferencesPatchRequest = {
    route: 'user_preferences/patch_preferences',
    payload: [
      {
        notificationId: 'notificationId',
        subNotificationId: 'subNotificationId',
        channelPreferences: [
          {
            channel: 'channel',
            state: false
          }
        ]
      }
    ]
  };
  await expect(server).toReceiveMessage(request);
});
