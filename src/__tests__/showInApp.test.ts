import $ from 'jquery';
import {
  InappNotification,
  NotificationAPIClientInterface,
  PopupPosition,
  MarkAsReadModes,
  WS_ClearUnreadRequest,
  WS_NewNotificationsResponse,
  WS_NotificationsRequest,
  WS_NotificationsResponse,
  WS_UnreadCountRequest,
  WS_UnreadCountResponse
} from '../interfaces';
import WS from 'jest-websocket-mock';
import NotificationAPI from '../index';
import { generateFakeNotifications } from './FakeNotificationGenerator';

const testNotification: InappNotification = {
  id: '1',
  seen: true,
  title: 'You have a new comment',
  redirectURL: 'https://www.notificationapi.com',
  imageURL: 'https://via.placeholder.com/350x150',
  date: new Date().toISOString()
};

const testNotificationWithoutImage: InappNotification = {
  id: '2',
  seen: true,
  title: 'You have a new comment',
  redirectURL: 'https://www.notificationapi.com',
  date: new Date().toISOString()
};

const testNotificationWithoutURL: InappNotification = {
  id: '3',
  seen: true,
  title: 'You have a new comment',
  imageURL: 'https://via.placeholder.com/350x150',
  date: new Date().toISOString()
};

const testNotificationUnseen: InappNotification = {
  id: '4',
  seen: false,
  title: 'You have a new comment',
  date: new Date().toISOString()
};
const timeCases_seconds = [
  -100,
  -10,
  10,
  1 * 60,
  2 * 60,
  1 * 60 * 60,
  2 * 60 * 60,
  1 * 60 * 60 * 24,
  2 * 60 * 60 * 24,
  1 * 60 * 60 * 24 * 30,
  2 * 60 * 60 * 24 * 30,
  1 * 60 * 60 * 24 * 30 * 365.25,
  2 * 60 * 60 * 24 * 30 * 365.25
].map((item, index) => {
  return index > 2 ? item * 1000 : item;
});
const notificationWithDifferentTimes: InappNotification[] =
  timeCases_seconds.map((timeCase_seconds, index) => {
    return {
      id: `${5 + index}`,
      seen: true,
      title: 'You have a new comment',
      redirectURL: 'https://www.notificationapi.com',
      imageURL: 'https://via.placeholder.com/350x150',
      date: new Date(Date.now() - timeCase_seconds).toISOString()
    };
  });
const timeCasesResults = [
  'just now',
  'just now',
  'just now',
  '1 minute ago',
  '2 minutes ago',
  '1 hour ago',
  '2 hours ago',
  '1 day ago',
  '2 days ago',
  '1 month ago',
  '2 months ago',
  '1 year ago',
  '2 years ago'
];
const fiftyNotifs: InappNotification[] = [];
for (let i = 0; i < 50; i++) {
  fiftyNotifs[i] = { ...testNotification, id: i.toString() };
}

const clientId = 'envId@';
const userId = 'userId@';

let spy: jest.SpyInstance;
let notificationapi: NotificationAPIClientInterface;
let server: WS;
beforeEach(() => {
  spy = jest.spyOn(console, 'error').mockImplementation();
  document.body.innerHTML =
    '<div id="root"></div><div id="root2"></div><div id="somethingelse">somethingelse</div>';
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1600
  });
  server = new WS('ws://localhost:1234', { jsonProtocol: true });
  notificationapi = new NotificationAPI({
    clientId,
    userId,
    websocket: 'ws://localhost:1234'
  });
});

afterEach(() => {
  WS.clean();
  spy.mockRestore();
  if (notificationapi) notificationapi.destroy();
});

describe('defaults', () => {
  test('given bad root element shows error', () => {
    notificationapi.showInApp({
      root: 'none'
    });
    expect(spy.mock.calls).toEqual([
      ['There are no HTML elements with id="none" on the page.']
    ]);
  });

  test('given bad popupPosition, throws error', () => {
    notificationapi.showInApp({
      root: 'root',
      popupPosition: <PopupPosition>(<unknown>'blah')
    });
    expect(spy.mock.calls).toEqual([
      [
        '"blah" is not a valid position. Valid positions: topLeft, topRight, leftTop, leftBottom, bottomLeft, bottomRight, rightTop, rightBottom'
      ]
    ]);
  });

  test('adds the a notificationapi container to the root', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    expect($('[id="root"] > .notificationapi-container')).toHaveLength(1);
  });

  test('adds the notification popup button to the container', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    expect(
      $('.notificationapi-container > .notificationapi-button')
    ).toHaveLength(1);
  });

  test('adds the notification popup to the container with .hovering.closed', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    expect(
      $(
        '.notificationapi-container > .notificationapi-popup.popup.hovering.closed:not(.inline)'
      )
    ).toHaveLength(1);
  });

  test('given no WS, throws no error', async () => {
    notificationapi = new NotificationAPI({
      clientId,
      userId,
      websocket: false
    });
    notificationapi.showInApp({
      root: 'root'
    });
    expect(spy.mock.calls).toEqual([]);
  });
});

describe('inline mode', () => {
  test('inline mode: adds a notification popup to the container with .inline', () => {
    notificationapi.showInApp({
      root: 'root',
      inline: true
    });
    expect(
      $(
        '.notificationapi-container > .notificationapi-popup.inline:not(.popup)'
      )
    ).toHaveLength(1);
  });

  test('inline mode: openInAppPopup and closeInAppPopup do not change popup style or throw error', () => {
    notificationapi.showInApp({
      root: 'root',
      inline: true
    });
    const classes = $('.notificationapi-popup')[0].classList;
    notificationapi.openInAppPopup();
    expect($('.notificationapi-popup')[0].classList).toEqual(classes);
    notificationapi.closeInAppPopup();
    expect($('.notificationapi-popup')[0].classList).toEqual(classes);
    expect(spy.mock.calls).toEqual([]);
  });
});

describe('popup interactions', () => {
  test('when button is clicked, popup has .hovering not .closed', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    $('.notificationapi-button').trigger('click');
    expect($('.notificationapi-popup').hasClass('hovering'));
    expect($('.notificationapi-popup').hasClass('closed')).toBeFalsy();
  });

  test('when button is clicked, unread badge is removed and requests clearing unread', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    await server.nextMessage;
    await server.nextMessage;
    $('.notificationapi-button').trigger('click');
    const expectedMsg: WS_ClearUnreadRequest = {
      route: 'inapp_web/unread_clear'
    };
    expect($('.notificationapi-unread').hasClass('hidden')).toBeTruthy();
    await expect(server).toReceiveMessage(expectedMsg);
  });

  test('when button is clicked then clicked again, popup has .closed', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    $('.notificationapi-button').trigger('click');
    $('.notificationapi-button').trigger('click');
    expect($('.notificationapi-popup').hasClass('closed'));
  });

  test('when button is clicked then popup content is clicked, popup is not .closed', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    $('.notificationapi-button').trigger('click');
    $('.notificationapi-header').trigger('click');
    expect($('.notificationapi-popup').hasClass('closed')).toBeFalsy();
  });

  test('when button is clicked then page clicked, popup has .closed', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    $('.notificationapi-button').trigger('click');
    $('body').trigger('click');
    expect($('.notificationapi-popup').hasClass('closed'));
  });

  test('when button is clicked then header close button clicked, popup has .closed', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    $('.notificationapi-button').trigger('click');
    $('.notificationapi-header .notificationapi-close-button').trigger('click');
    expect($('.notificationapi-popup').hasClass('closed'));
  });

  test('when button is clicked, then preferences button is clicked, calls showUserPreferences', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    spy = jest
      .spyOn(notificationapi, 'showUserPreferences')
      .mockImplementation();
    $('.notificationapi-button').trigger('click');
    $('.notificationapi-header .notificationapi-preferences-button').trigger(
      'click'
    );
    expect(spy.mock.calls).toHaveLength(1);
  });

  test('when button is clicked, then preferences button is clicked, then anything in preferences are clicked, popup is not .closed', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    $('.notificationapi-button').trigger('click');
    $('.notificationapi-preferences-button').trigger('click');
    $('.notificationapi-preferences-container').trigger('click');
    expect($('.notificationapi-popup').hasClass('closed')).toBeFalsy();
  });

  // TODO: add tests to validate correct positioning
  test('works with all different popupPosition variations', () => {
    Object.values(PopupPosition).map((popupPosition) => {
      notificationapi.showInApp({
        root: 'root',
        popupPosition: <PopupPosition>(<unknown>popupPosition)
      });
      $('.notificationapi-button').trigger('click');
      expect(spy.mock.calls).toEqual([]);
    });
  });

  // TODO: add tests to validate correct sizing in small screen
  test('works in screens smaller than 768', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767
    });
    notificationapi.showInApp({
      root: 'root'
    });
    $('.notificationapi-button').trigger('click');
    expect(spy.mock.calls).toEqual([]);
  });

  test('after receiving >=50 notifications, scrolling to the end triggers requesting 50 more before the oldest notification', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    await server.nextMessage; // unread request
    await server.nextMessage; // notifications request
    fiftyNotifs[49] = {
      ...testNotification,
      id: '49',
      date: '1989-09-28T10:00:00.000Z'
    };
    const res: WS_NotificationsResponse = {
      route: 'inapp_web/notifications',
      payload: {
        notifications: fiftyNotifs
      }
    };
    server.send(res);
    $('.notificationapi-button').trigger('click');
    await server.nextMessage; // clear request
    $('.notificationapi-popup-inner')[0].dispatchEvent(
      new CustomEvent('scroll')
    );
    const req4: WS_NotificationsRequest = {
      route: 'inapp_web/notifications',
      payload: {
        before: '1989-09-28T10:00:00.000Z',
        count: 50
      }
    };
    await expect(server).toReceiveMessage(req4);
  });

  test('after receiving >=50 notifications, after scrolling and requesting more, scrolling quickly again does not trigger requesting more', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    await server.nextMessage; // unread request
    await server.nextMessage; // notifications request
    const res: WS_NotificationsResponse = {
      route: 'inapp_web/notifications',
      payload: {
        notifications: fiftyNotifs
      }
    };
    server.send(res);
    $('.notificationapi-button').trigger('click');
    await server.nextMessage; // clear request
    $('.notificationapi-popup-inner')[0].dispatchEvent(
      new CustomEvent('scroll')
    );
    $('.notificationapi-popup-inner')[0].dispatchEvent(
      new CustomEvent('scroll')
    );
    $('.notificationapi-popup-inner')[0].dispatchEvent(
      new CustomEvent('scroll')
    );

    await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s
    expect(server.messages).toHaveLength(4);
  });

  test('after receiving <50 notifications, scrolling does not trigger requetsing more', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    await server.nextMessage; // unread request
    await server.nextMessage; // notifications request
    const res: WS_NotificationsResponse = {
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification]
      }
    };
    server.send(res);
    $('.notificationapi-button').trigger('click');
    await server.nextMessage; // clear request
    $('.notificationapi-popup-inner')[0].dispatchEvent(
      new CustomEvent('scroll')
    );
    await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s
    expect(server.messages).toHaveLength(3);
    expect($('.notificationapi-nomore')).toHaveLength(1);
  });
});

describe('setUnread', () => {
  test('doesnt not display or break in inline mode', () => {
    notificationapi.showInApp({
      root: 'root',
      inline: true
    });
    notificationapi.setInAppUnread(123);
    expect($('.notificationapi-unread')).toHaveLength(0);
    expect(spy.mock.calls).toHaveLength(0);
  });

  test('given 0, is not displayed', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.setInAppUnread(0);
    expect($('.notificationapi-unread').hasClass('hidden')).toBeTruthy();
  });

  test('given 1, shows 1', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.setInAppUnread(1);
    expect($('.notificationapi-unread').hasClass('hidden')).toBeFalsy();
    expect($('.notificationapi-unread').html()).toEqual('1');
  });

  test('given 100, shows +99', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.setInAppUnread(100);
    expect($('.notificationapi-unread').hasClass('hidden')).toBeFalsy();
    expect($('.notificationapi-unread').html()).toEqual('+99');
  });
});

describe('Handling WS_NotificationsResponse', () => {
  test('happening before showInApp, does not throw', () => {
    notificationapi = new NotificationAPI({
      clientId,
      userId,
      websocket: false
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification]
      }
    });
    expect(spy.mock.calls).toEqual([]);
  });

  test('defaults to loading state, no notifications or empty message', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    expect($('.notificationapi-loading')).toHaveLength(1);
    expect($('.notificationapi-empty')).toHaveLength(0);
    expect($('.notificationapi-notification')).toHaveLength(0);
  });

  test('given 0 notifications, adds no notifications and shows empty, removes loading', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: []
      }
    });
    expect($('.notificationapi-empty')).toHaveLength(1);
    expect($('.notificationapi-notification')).toHaveLength(0);
    expect($('.notificationapi-loading')).toHaveLength(0);
  });

  test('after showing empty, given any notifications, adds notification and removes empty/loading', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: []
      }
    });
    expect($('.notificationapi-empty')).toHaveLength(1);
    expect($('.notificationapi-loading')).toHaveLength(0);
    expect($('.notificationapi-notification')).toHaveLength(0);
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification]
      }
    });
    expect($('.notificationapi-empty')).toHaveLength(0);
    expect($('.notificationapi-loading')).toHaveLength(0);
    expect($('.notificationapi-notification')).toHaveLength(1);
  });

  test('given 2, adds 2 notifications', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification, testNotificationUnseen]
      }
    });
    expect($('.notificationapi-notification')).toHaveLength(2);
  });

  test('given 1 notification, shows title, message, image and date with correct redirect', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification]
      }
    });
    expect($('.notificationapi-notification').attr('href')).toEqual(
      testNotification.redirectURL
    );
    expect($('.notificationapi-notification-title').text()).toEqual(
      testNotification.title
    );
    expect($('.notificationapi-notification-image').attr('src')).toEqual(
      testNotification.imageURL
    );
    expect($('.notificationapi-notification-date').text()).toEqual('just now');
  });

  describe('Relative times', () => {
    notificationWithDifferentTimes.map(
      (notificationWithDifferentTime, index) => {
        test(`notification date with ${timeCases_seconds[index]} milliseconds relative time difference shows as  ${timeCasesResults[index]}`, () => {
          notificationapi.showInApp({
            root: 'root'
          });
          notificationapi.websocketHandlers.notifications({
            route: 'inapp_web/notifications',
            payload: {
              notifications: [notificationWithDifferentTime]
            }
          });
          expect($('.notificationapi-notification-date').text()).toEqual(
            timeCasesResults[index]
          );
        });
      }
    );
  });

  test('without url, does not redirect', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotificationWithoutURL]
      }
    });
    expect($('.notificationapi-notification').attr('href')).toBeFalsy();
  });

  test('without image, ignores image, uses icon', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotificationWithoutImage]
      }
    });
    expect($('.notificationapi-notification-image')).toHaveLength(0);
  });

  test('unseen notification has unseen class on it', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotificationUnseen]
      }
    });
    expect($('.notificationapi-notification').hasClass('unseen')).toBeTruthy();
  });

  test('notifications with repeat ID are not added', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification]
      }
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification]
      }
    });
    expect($('.notificationapi-notification')).toHaveLength(1);
  });

  test('incoming new notification is placed at the top', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification, testNotificationWithoutImage]
      }
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [
          {
            ...testNotification,
            date: new Date('2030-01-01').toISOString(),
            id: 'new'
          }
        ]
      }
    });
    expect(
      $('.notificationapi-popup-inner')
        .children()[1] // element 0 is header
        .getAttribute('data-notification-id')
    ).toEqual('new');
  });

  test('incoming old notification is placed at the bottom', () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [testNotification, testNotificationWithoutImage]
      }
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [
          {
            ...testNotification,
            date: new Date('2000-01-01').toISOString(),
            id: 'old'
          }
        ]
      }
    });
    expect(
      $('.notificationapi-popup-inner')
        .children()[3] // element 0 is header
        .getAttribute('data-notification-id')
    ).toEqual('old');
  });
});

describe('websocket send & receives', () => {
  test('given WS is not open, requests for unread count and notifications after it is opened', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    const req1: WS_UnreadCountRequest = {
      route: 'inapp_web/unread_count'
    };
    const req2: WS_NotificationsRequest = {
      route: 'inapp_web/notifications',
      payload: {
        count: 50
      }
    };
    await expect(server).toReceiveMessage(req1);
    await expect(server).toReceiveMessage(req2);
  });

  test('given WS is open, requests for unread count and notifications', async () => {
    await server.connected; // ensuring WS is open
    notificationapi.showInApp({
      root: 'root'
    });
    const req1: WS_UnreadCountRequest = {
      route: 'inapp_web/unread_count'
    };
    const req2: WS_NotificationsRequest = {
      route: 'inapp_web/notifications',
      payload: {
        count: 50
      }
    };
    await expect(server).toReceiveMessage(req1);
    await expect(server).toReceiveMessage(req2);
  });

  test('given malformed message, doesnt break', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    server.send('test');
    expect(spy.mock.calls).toHaveLength(0);
  });

  test('given WS_UnreadCountResponse, calls websocketHandlers.unreadCount', async () => {
    const spy = jest.spyOn(notificationapi.websocketHandlers, 'unreadCount');
    notificationapi.showInApp({
      root: 'root'
    });
    const res: WS_UnreadCountResponse = {
      route: 'inapp_web/unread_count',
      payload: {
        count: 3
      }
    };
    server.send(res);
    expect(spy).toHaveBeenCalledWith(res);
  });

  test('given WS_NotificationsResponse, calls websocketHandlers.notifications', async () => {
    const spy = jest.spyOn(notificationapi.websocketHandlers, 'notifications');
    notificationapi.showInApp({
      root: 'root'
    });
    const res: WS_NotificationsResponse = {
      route: 'inapp_web/notifications',
      payload: {
        notifications: []
      }
    };
    server.send(res);
    expect(spy).toHaveBeenCalledWith(res);
  });

  test('given WS_NewNotificationsResponse, calls websocketHandlers.newNotifications', async () => {
    const spy = jest.spyOn(
      notificationapi.websocketHandlers,
      'newNotifications'
    );
    notificationapi.showInApp({
      root: 'root'
    });
    const res: WS_NewNotificationsResponse = {
      route: 'inapp_web/new_notifications',
      payload: {
        notifications: []
      }
    };
    server.send(res);
    expect(spy).toHaveBeenCalledWith(res);
  });

  // needs refactoring:
  test('given < 50 notifications, renders them and no more message', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    const message: WS_NotificationsResponse = {
      route: 'inapp_web/notifications',
      payload: { notifications: [testNotification, testNotificationUnseen] }
    };
    server.send(message);
    expect($('.notificationapi-notification')).toHaveLength(2);
    expect($('.notificationapi-nomore')).toHaveLength(1);
  });

  test('given no notifications, renders empty state and not no more', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    const message: WS_NotificationsResponse = {
      route: 'inapp_web/notifications',
      payload: { notifications: [] }
    };
    server.send(message);
    expect($('.notificationapi-notification')).toHaveLength(0);
    expect($('.notificationapi-empty')).toHaveLength(1);
    expect($('.notificationapi-nomore')).toHaveLength(0);
  });

  test('given new notifications (actual new and repeats), updates actual unread count on popup and shows actual new notificaitons in popup', async () => {
    notificationapi.showInApp({
      root: 'root'
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: { notifications: [testNotification] }
    });
    notificationapi.websocketHandlers.unreadCount({
      route: 'inapp_web/unread_count',
      payload: { count: 1 }
    });
    notificationapi.websocketHandlers.newNotifications({
      route: 'inapp_web/new_notifications',
      payload: {
        notifications: [
          testNotification,
          testNotificationUnseen,
          testNotificationWithoutImage
        ]
      }
    });

    expect($('.notificationapi-notification')).toHaveLength(3);
    expect($('.notificationapi-unread').text()).toEqual('3');
  });
});

describe('paginated', () => {
  test('displays next/prev buttons', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true
    });
    expect(
      $('.notificationapi-footer > .notificationapi-prev-button:disabled')
    ).toHaveLength(1);
    expect(
      $('.notificationapi-footer > .notificationapi-next-button:disabled')
    ).toHaveLength(1);
  });

  test('only displays first 5 notifications', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: generateFakeNotifications(15)
      }
    });

    expect($('.notificationapi-notification')).toHaveLength(5);
    expect($('[data-notification-id="fake-0"]')).toHaveLength(1);
    expect($('[data-notification-id="fake-4"]')).toHaveLength(1);
  });

  test('when next is clicked, shows the next 5', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: generateFakeNotifications(15)
      }
    });

    notificationapi.elements.nextButton?.click();
    expect($('.notificationapi-notification')).toHaveLength(5);
    expect($('[data-notification-id="fake-5"]')).toHaveLength(1);
    expect($('[data-notification-id="fake-9"]')).toHaveLength(1);
  });

  test('when next is clicked, then prev is clicked, shows the first 5', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: generateFakeNotifications(15)
      }
    });

    notificationapi.elements.nextButton?.click();
    notificationapi.elements.prevButton?.click();
    expect($('.notificationapi-notification')).toHaveLength(5);
    expect($('[data-notification-id="fake-0"]')).toHaveLength(1);
    expect($('[data-notification-id="fake-4"]')).toHaveLength(1);
  });

  test('prev & next are disabled page 1/1', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: generateFakeNotifications(5)
      }
    });
    expect($('.notificationapi-prev-button:disabled')).toHaveLength(1);
    expect($('.notificationapi-next-button:disabled')).toHaveLength(1);
  });

  test('next is enabled, prev is disabled page 1/3 pages', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: generateFakeNotifications(15)
      }
    });
    expect($('.notificationapi-prev-button:disabled')).toHaveLength(1);
    expect($('.notificationapi-next-button:not(:disabled)')).toHaveLength(1);
  });

  test('next & prev are enabled page 2/3 pages', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: generateFakeNotifications(15)
      }
    });
    notificationapi.elements.nextButton?.click();
    expect($('.notificationapi-prev-button:not(:disabled)')).toHaveLength(1);
    expect($('.notificationapi-next-button:not(:disabled)')).toHaveLength(1);
  });

  test('next is disabled & prev is enabled page 3/3 pages', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: generateFakeNotifications(15)
      }
    });
    notificationapi.elements.nextButton?.click();
    notificationapi.elements.nextButton?.click();
    expect($('.notificationapi-prev-button:not(:disabled)')).toHaveLength(1);
    expect($('.notificationapi-next-button:disabled')).toHaveLength(1);
  });

  test('uses pageSize for custom pagination page size', () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true,
      pageSize: 15
    });
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: generateFakeNotifications(15)
      }
    });
    expect($('.notificationapi-next-button:disabled')).toHaveLength(1);
  });

  test('loads more notifications when it reaches one page before last', async () => {
    notificationapi.showInApp({
      root: 'root',
      paginated: true,
      pageSize: 10
    });
    await server.nextMessage; // unread
    await server.nextMessage; // notifications
    notificationapi.websocketHandlers.notifications({
      route: 'inapp_web/notifications',
      payload: {
        notifications: [
          ...generateFakeNotifications(49),
          {
            ...testNotification,
            date: '1989-09-28T10:00:00.000Z'
          }
        ]
      }
    });
    expect(notificationapi.state.notifications).toHaveLength(50);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s, does not load more quickly intentionally

    notificationapi.elements.nextButton?.click(); // page 2
    notificationapi.elements.nextButton?.click(); // page 3
    notificationapi.elements.nextButton?.click(); // page 4

    const req3: WS_NotificationsRequest = {
      route: 'inapp_web/notifications',
      payload: {
        before: '1989-09-28T10:00:00.000Z',
        count: 50
      }
    };
    await expect(server).toReceiveMessage(req3);
  });
});

describe('setAsReadMode', () => {
  [MarkAsReadModes.MANUAL, MarkAsReadModes.MANUAL_AND_CLICK].map((mode) => {
    describe('MANUAL & MANUAL_AND_CLICK', () => {
      test('given unread count/badge, when popup in opened, unread count/badge do not clear', async () => {
        notificationapi.showInApp({
          root: 'root',
          markAsReadMode: mode
        });
        notificationapi.websocketHandlers.unreadCount({
          route: 'inapp_web/unread_count',
          payload: {
            count: 5
          }
        });
        $('.notificationapi-button').trigger('click');
        expect($('.notificationapi-unread').hasClass('hidden')).toBeFalsy();
        expect($('.notificationapi-unread').html()).toEqual('5');
        expect(notificationapi.state.unread).toEqual(5);
      });

      test('when mark all as read button is clicked, clear request is sent and count/badge is cleared, all notifications lose .unseen class, all notifications are set to seen', async () => {
        notificationapi.showInApp({
          root: 'root',
          markAsReadMode: mode
        });
        await server.nextMessage;
        await server.nextMessage;
        notificationapi.websocketHandlers.unreadCount({
          route: 'inapp_web/unread_count',
          payload: {
            count: 5
          }
        });
        notificationapi.websocketHandlers.notifications({
          route: 'inapp_web/notifications',
          payload: {
            notifications: [testNotification, testNotificationUnseen]
          }
        });
        $('.notificationapi-button').trigger('click');
        $('.notificationapi-readAll-button').trigger('click');
        expect($('.notificationapi-unread').hasClass('hidden')).toBeTruthy();
        expect($('.notificationapi-unread').html()).toEqual('0');
        expect(notificationapi.state.unread).toEqual(0);
        expect(
          notificationapi.state.notifications.filter((n) => !n.seen)
        ).toHaveLength(0);
        expect($('.unseen')).toHaveLength(0);
        const expectedMsg: WS_ClearUnreadRequest = {
          route: 'inapp_web/unread_clear'
        };
        await expect(server).toReceiveMessage(expectedMsg);
      });

      test('there is a menu button for all seen/unseen notifications', () => {
        notificationapi.showInApp({
          root: 'root',
          markAsReadMode: mode
        });
        notificationapi.websocketHandlers.notifications({
          route: 'inapp_web/notifications',
          payload: {
            notifications: [testNotification, testNotificationUnseen]
          }
        });
        expect(
          $(
            '[data-notification-id="4"] .notificationapi-notification-menu-button'
          )
        ).toHaveLength(1);
        expect(
          $(
            '[data-notification-id="1"] .notificationapi-notification-menu-button'
          )
        ).toHaveLength(1);
      });

      test('clicking menu button creates a menu, clicking the body deletes the menu but keeps the popup open', () => {
        notificationapi.showInApp({
          root: 'root',
          markAsReadMode: mode
        });
        notificationapi.websocketHandlers.notifications({
          route: 'inapp_web/notifications',
          payload: {
            notifications: [testNotificationUnseen]
          }
        });
        $('.notificationapi-button').trigger('click');
        $('.notificationapi-notification-menu-button').trigger('click');
        expect($('.notificationapi-notification-menu')).toHaveLength(1);
        $('body').trigger('click');
        expect($('.notificationapi-notification-menu')).toHaveLength(0);
        expect($('#root .notificationapi-popup.closed')).toHaveLength(0);
      });

      test('cannot have 2 menus open', () => {
        notificationapi.showInApp({
          root: 'root',
          markAsReadMode: mode
        });
        notificationapi.websocketHandlers.notifications({
          route: 'inapp_web/notifications',
          payload: {
            notifications: [
              testNotificationUnseen,
              {
                ...testNotificationUnseen,
                id: '1'
              }
            ]
          }
        });
        $('.notificationapi-button').trigger('click');
        $(
          '[data-notification-id="1"] .notificationapi-notification-menu-button'
        ).trigger('click');
        $(
          '[data-notification-id="4"] .notificationapi-notification-menu-button'
        ).trigger('click');
        expect($('.notificationapi-notification-menu')).toHaveLength(1);
      });

      test('clicking "Mark as Read" menu item reduces unread count, sends a unread ws message and closes the menu but not popup', async () => {
        notificationapi.showInApp({
          root: 'root',
          markAsReadMode: mode
        });
        await server.nextMessage;
        await server.nextMessage;
        notificationapi.websocketHandlers.unreadCount({
          route: 'inapp_web/unread_count',
          payload: {
            count: 5
          }
        });
        notificationapi.websocketHandlers.notifications({
          route: 'inapp_web/notifications',
          payload: {
            notifications: [testNotificationUnseen]
          }
        });
        $('.notificationapi-button').trigger('click');
        $('.notificationapi-notification-menu-button').trigger('click');
        expect($('.notificationapi-notification-menu')).toHaveLength(1);
        $('.notificationapi-notification-menu-item').trigger('click');
        expect($('.notificationapi-unread')[0].innerHTML).toEqual('4');
        expect(notificationapi.state.unread).toEqual(4);
        expect($('.notificationapi-notification-menu')).toHaveLength(0);
        expect($('#root .notificationapi-popup.closed')).toHaveLength(0);
        const expectedMsg: WS_ClearUnreadRequest = {
          route: 'inapp_web/unread_clear',
          payload: {
            notificationId: '4'
          }
        };
        expect(server).toReceiveMessage(expectedMsg);
      });
    });
  });

  describe('MANUAL_AND_CLICK', () => {
    test('clicking an unseen notification reduces unread count, changes the notification ui, sends a unread ws message', async () => {
      notificationapi.showInApp({
        root: 'root',
        markAsReadMode: MarkAsReadModes.MANUAL_AND_CLICK
      });
      await server.nextMessage;
      await server.nextMessage;
      notificationapi.websocketHandlers.unreadCount({
        route: 'inapp_web/unread_count',
        payload: {
          count: 5
        }
      });
      notificationapi.websocketHandlers.notifications({
        route: 'inapp_web/notifications',
        payload: {
          notifications: [
            {
              ...testNotificationUnseen,
              seen: false
            }
          ]
        }
      });
      $('.notificationapi-button').trigger('click');
      $('.notificationapi-notification-title').trigger('click');
      expect($('.notificationapi-unread')[0].innerHTML).toEqual('4');
      expect(notificationapi.state.unread).toEqual(4);
      expect($('.notificationapi-notification-menu')).toHaveLength(0);
      const expectedMsg: WS_ClearUnreadRequest = {
        route: 'inapp_web/unread_clear',
        payload: {
          notificationId: '4'
        }
      };
      expect(server).toReceiveMessage(expectedMsg);

      // clicking it again, does not reduce the unread count again:
      $('.notificationapi-notification-title').trigger('click');
      expect($('.notificationapi-unread')[0].innerHTML).toEqual('4');
      expect(notificationapi.state.unread).toEqual(4);
    });

    test('clicking a seen notification doesnt do the above', async () => {
      notificationapi.showInApp({
        root: 'root',
        markAsReadMode: MarkAsReadModes.MANUAL_AND_CLICK
      });
      await server.nextMessage;
      await server.nextMessage;
      notificationapi.websocketHandlers.unreadCount({
        route: 'inapp_web/unread_count',
        payload: {
          count: 5
        }
      });
      notificationapi.websocketHandlers.notifications({
        route: 'inapp_web/notifications',
        payload: {
          notifications: [
            {
              ...testNotificationUnseen,
              seen: true
            }
          ]
        }
      });
      $('.notificationapi-button').trigger('click');
      $('.notificationapi-notification-title').trigger('click');
      expect($('.notificationapi-unread')[0].innerHTML).toEqual('5');
      expect(notificationapi.state.unread).toEqual(5);
      expect($('.notificationapi-notification-menu')).toHaveLength(0);
      const expectedMsg: WS_ClearUnreadRequest = {
        route: 'inapp_web/unread_clear',
        payload: {
          notificationId: '4'
        }
      };
      expect(server).toReceiveMessage(expectedMsg);
    });
  });
});
