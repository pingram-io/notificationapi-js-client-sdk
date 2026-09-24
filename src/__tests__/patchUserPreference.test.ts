import { NotificationAPIClientInterface } from '../interfaces';
import NotificationAPI from '../index';

const clientId = 'envId@';
const userId = 'userId@';

let spy: jest.SpyInstance;
let notificationapi: NotificationAPIClientInterface;

beforeEach(() => {
  spy = jest.spyOn(console, 'error').mockImplementation();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => ''
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

test('posts a preference update', () => {
  notificationapi.patchUserPreference('notificationId', 'channel', false);
  const call = (global.fetch as jest.Mock).mock.calls[0];
  expect(call[0]).toEqual(
    'https://api.notificationapi.com/enduser/preferences'
  );
  expect(call[1].method).toEqual('POST');
  expect(JSON.parse(call[1].body)).toEqual([
    {
      notificationId: 'notificationId',
      subNotificationId: '',
      channel: 'channel',
      state: false
    }
  ]);
});

test('posts a preference update with subNotificationId', () => {
  notificationapi.patchUserPreference(
    'notificationId',
    'channel',
    false,
    'subNotificationId'
  );
  const call = (global.fetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(call[1].body)).toEqual([
    {
      notificationId: 'notificationId',
      subNotificationId: 'subNotificationId',
      channel: 'channel',
      state: false
    }
  ]);
});
