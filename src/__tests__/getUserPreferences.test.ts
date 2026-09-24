import { NotificationAPIClientInterface } from '../interfaces';
import NotificationAPI from '../index';

const clientId = 'envId@';
const userId = 'userId@';

let spy: jest.SpyInstance;
let notificationapi: NotificationAPIClientInterface;

const emptyPreferences = {
  preferences: [],
  notifications: [],
  subNotifications: []
};

beforeEach(() => {
  spy = jest.spyOn(console, 'error').mockImplementation();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(emptyPreferences)
  });
  notificationapi = new NotificationAPI({
    clientId,
    userId,
    websocket: false
  });
});

afterEach(() => {
  spy.mockRestore();
  if (notificationapi) notificationapi.destroy();
});

test('requests GET /enduser/preferences', async () => {
  await notificationapi.getUserPreferences();
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toEqual(
    'https://api.notificationapi.com/enduser/preferences'
  );
  expect((global.fetch as jest.Mock).mock.calls[0][1].method).toEqual('GET');
  expect(
    (global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization
  ).toEqual('Basic ' + btoa(`${clientId}:${userId}:`));
});

test('returns preferences mapped from the REST payload', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        preferences: [
          {
            notificationId: 'welcome',
            channel: 'EMAIL',
            delivery: 'off'
          }
        ],
        notifications: [
          {
            notificationId: 'welcome',
            title: 'Welcome'
          }
        ],
        subNotifications: []
      })
  });
  const result = await notificationapi.getUserPreferences();
  expect(result).toEqual([
    {
      notificationId: 'welcome',
      title: 'Welcome',
      settings: [
        {
          channel: 'EMAIL',
          channelName: 'Email',
          state: false
        }
      ]
    }
  ]);
});
