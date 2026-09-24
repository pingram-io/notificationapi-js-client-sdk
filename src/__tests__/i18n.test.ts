import $ from 'jquery';
import { NotificationAPIClientInterface } from '../interfaces';
import WS from 'jest-websocket-mock';
import NotificationAPI from '../index';

const clientId = 'envId@';
const userId = 'userId@';
let notificationapi: NotificationAPIClientInterface;
beforeEach(() => {
  document.body.innerHTML =
    '<div id="root"></div><div id="root2"></div><div id="somethingelse">somethingelse</div>';

  new WS('ws://localhost:1234', { jsonProtocol: true });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ count: 0, notifications: [] })
  });
});

afterEach(() => {
  WS.clean();
  if (notificationapi) notificationapi.destroy();
});

describe('Support multiple languages', () => {
  test('The empty notification message (default behavior is english)', async () => {
    notificationapi = new NotificationAPI({
      clientId,
      userId,
      websocket: 'ws://localhost:1234'
    });
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: { notifications: [] }
    });
    expect($('.notificationapi-empty').text()).toBe(
      "You don't have any notifications!"
    );
  });
  test('The empty notification message in spanish', async () => {
    notificationapi = new NotificationAPI({
      clientId,
      userId,
      websocket: 'ws://localhost:1234',
      language: 'es-ES'
    });
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: { notifications: [] }
    });
    expect($('.notificationapi-empty').text()).toBe(
      '¡No tienes ninguna notificación!'
    );
  });
});
