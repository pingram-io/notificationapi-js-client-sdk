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

test('sends the user hash and uses a custom REST host', async () => {
  const hashed = new NotificationAPI({
    clientId,
    userId,
    userIdHash: 'hash',
    restBaseURL: 'https://api.pingram.io',
    websocket: false
  });
  await hashed.getUserPreferences();
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toEqual(
    'https://api.pingram.io/enduser/preferences'
  );
  expect(
    (global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization
  ).toEqual('Basic ' + btoa(`${clientId}:${userId}:hash`));
  hashed.destroy();
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

test('maps sub-notifications and drops web push', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        preferences: [
          {
            notificationId: 'n1',
            channel: 'EMAIL',
            delivery: 'instant'
          },
          {
            notificationId: 'n1',
            channel: 'FAX',
            delivery: 'daily'
          },
          {
            notificationId: 'n1',
            subNotificationId: 's1',
            channel: 'SMS',
            delivery: 'off'
          },
          {
            notificationId: 'n1',
            subNotificationId: 's1',
            channel: 'WEB_PUSH',
            delivery: 'instant'
          }
        ],
        notifications: [{ notificationId: 'n1', title: 'Hello' }],
        subNotifications: [
          {
            notificationId: 'other',
            subNotificationId: 'nope',
            title: 'Ignored'
          },
          {
            notificationId: 'n1',
            subNotificationId: 's1',
            title: 'Sub'
          }
        ]
      })
  });
  await expect(notificationapi.getUserPreferences()).resolves.toEqual([
    {
      notificationId: 'n1',
      title: 'Hello',
      settings: [
        { channel: 'EMAIL', channelName: 'Email', state: true },
        { channel: 'FAX', channelName: 'FAX', state: true }
      ],
      subNotificationPreferences: [
        {
          notificationId: 'n1',
          subNotificationId: 's1',
          title: 'Sub',
          settings: [{ channel: 'SMS', channelName: 'SMS', state: false }]
        }
      ]
    }
  ]);
});

test('treats missing preference arrays as empty', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        notifications: [{ notificationId: 'n1', title: 'Hello' }]
      })
  });
  await expect(notificationapi.getUserPreferences()).resolves.toEqual([
    {
      notificationId: 'n1',
      title: 'Hello',
      settings: []
    }
  ]);
});

test('maps sub-notifications when preference rows are missing', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        notifications: [{ notificationId: 'n1', title: 'Hello' }],
        subNotifications: [
          {
            notificationId: 'n1',
            subNotificationId: 's1',
            title: 'Sub'
          }
        ]
      })
  });
  await expect(notificationapi.getUserPreferences()).resolves.toEqual([
    {
      notificationId: 'n1',
      title: 'Hello',
      settings: [],
      subNotificationPreferences: [
        {
          notificationId: 'n1',
          subNotificationId: 's1',
          title: 'Sub',
          settings: []
        }
      ]
    }
  ]);
});

test('treats a missing notification list as empty', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({})
  });
  await expect(notificationapi.getUserPreferences()).resolves.toEqual([]);
});

test('rejects with the API error message', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({ error: 'Invalid request body' })
  });
  await expect(notificationapi.getUserPreferences()).rejects.toThrow(
    'Invalid request body'
  );
});

test('rejects with the status when the error is not a string', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({ error: { message: 'nope' } })
  });
  await expect(notificationapi.getUserPreferences()).rejects.toThrow(
    'Request failed (400)'
  );
});

test('rejects with the status when the error body has no message', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 500,
    text: async () => ''
  });
  await expect(notificationapi.getUserPreferences()).rejects.toThrow(
    'Request failed (500)'
  );
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
