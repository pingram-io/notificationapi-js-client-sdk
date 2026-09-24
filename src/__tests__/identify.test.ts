import NotificationAPIClient from '..';
import { NotificationAPIClientInterface } from '../interfaces';

// Mocking the fetch API
global.fetch = jest.fn();
const fetchMock = global.fetch as jest.Mock;

const clientId = 'env:Id';
const userId = 'user:Id';

let spy: jest.SpyInstance;
let notificationapi: NotificationAPIClientInterface;

beforeEach(() => {
  spy = jest.spyOn(console, 'error').mockImplementation();
  notificationapi = new NotificationAPIClient({
    clientId,
    userId
  });
});

afterEach(() => {
  spy.mockRestore();
  fetchMock.mockClear();
  if (notificationapi) notificationapi.destroy();
});

describe('when identify is called', () => {
  it('returns error when userIds do not match', async () => {
    notificationapi.identify({
      id: 'somethingelse'
    });

    expect(spy.mock.calls).toEqual([
      [
        'The userId "somethingelse" does not match the userId "user:Id" provided in the init options. Cancelling action to prevent mistakes.'
      ]
    ]);
  });

  describe('makes an API request', () => {
    beforeEach(() => {
      notificationapi.identify({ email: 'something' });
    });
    it('exactly once', async () => {
      expect(fetchMock).toBeCalledTimes(1);
    });

    it('to the right url', async () => {
      expect(fetchMock.mock.calls[0][0]).toEqual(
        `https://api.notificationapi.com/enduser/${encodeURIComponent(userId)}`
      );
    });

    it('with POST method', async () => {
      expect(fetchMock.mock.calls[0][1]['method']).toEqual('POST');
    });

    it('with json content-type in header', async () => {
      expect(fetchMock.mock.calls[0][1]['headers']['content-type']).toEqual(
        'application/json'
      );
    });

    it('with the right auth header', async () => {
      expect(fetchMock.mock.calls[0][1]['headers']['Authorization']).toEqual(
        'Basic ' + btoa(`${clientId}:${userId}:`)
      );
    });

    it('with the function params as the body', async () => {
      expect(fetchMock.mock.calls[0][1]['body']).toEqual(
        JSON.stringify({ email: 'something' })
      );
    });
  });
});
