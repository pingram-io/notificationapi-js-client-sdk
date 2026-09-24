import $ from 'jquery';
import { NotificationAPIClientInterface } from '../interfaces';
import WS from 'jest-websocket-mock';
import NotificationAPI from '../index';

const clientId = 'envId@';
const userId = 'userId@';

let spy: jest.SpyInstance;
let notificationapi: NotificationAPIClientInterface;

const emailInAppPreference = {
  notificationId: 'notificationId1',
  title: 'title1',
  settings: [
    {
      channel: 'EMAIL',
      channelName: 'Email',
      state: true
    },
    {
      channel: 'INAPP_WEB',
      channelName: 'In-App (Web)',
      state: false
    }
  ]
};

const inappSMSPreference = {
  notificationId: 'notificationId2',
  title: 'title2',
  settings: [
    {
      channel: 'INAPP_WEB',
      channelName: 'In-App (Web)',
      state: false
    },
    {
      channel: 'SMS',
      channelName: 'SMS',
      state: true
    }
  ]
};

beforeEach(() => {
  spy = jest.spyOn(console, 'error').mockImplementation();
  document.body.innerHTML = '<div id="root"></div><div id="root2"></div>';
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1600
  });
  new WS('ws://localhost:1234', { jsonProtocol: true });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        preferences: [],
        notifications: [],
        subNotifications: []
      })
  });
  notificationapi = new NotificationAPI({
    clientId,
    userId,
    websocket: 'ws://localhost:1234'
  });
});

afterEach(() => {
  WS.clean();
  spy.mockRestore();
  jest.restoreAllMocks();
  if (notificationapi) notificationapi.destroy();
});

describe('default elements and interactions', () => {
  test('adds the a notificationapi preferences container to the body', () => {
    notificationapi.showUserPreferences();
    expect(
      $('body > div[class="notificationapi-preferences-container"]')
    ).toHaveLength(1);
  });

  test('adds a backdrop to the container', () => {
    notificationapi.showUserPreferences();
    expect(
      $(
        'div[class="notificationapi-preferences-container"] > .notificationapi-preferences-backdrop'
      )
    ).toHaveLength(1);
  });

  test('when backdrop is clicked, container gets .closed', () => {
    notificationapi.showUserPreferences();
    $('.notificationapi-preferences-backdrop').trigger('click');
    expect($('.notificationapi-preferences-container.closed')).toHaveLength(1);
  });

  test('running showUserPreferences() again removes .closed without recreating elements', () => {
    notificationapi.showUserPreferences();
    $('.notificationapi-preferences-backdrop').trigger('click');
    notificationapi.showUserPreferences();
    expect($('.notificationapi-preferences-container.closed')).toHaveLength(0);
    expect($('.notificationapi-preferences-container')).toHaveLength(1);
  });

  test('adds a popup to the container', () => {
    notificationapi.showUserPreferences();
    expect(
      $(
        '.notificationapi-preferences-container > .notificationapi-preferences-popup'
      )
    ).toHaveLength(1);
  });

  test('adds a close button to the popup', () => {
    notificationapi.showUserPreferences();
    expect(
      $(
        '.notificationapi-preferences-popup > button[class="notificationapi-preferences-close"]'
      )
    ).toHaveLength(1);
  });

  test('when close button is clicked, container gets .closed', () => {
    notificationapi.showUserPreferences();
    $('.notificationapi-preferences-close').trigger('click');
    expect($('.notificationapi-preferences-container.closed')).toHaveLength(1);
  });

  test('adds loading animation to the popup', () => {
    notificationapi.showUserPreferences();
    expect(
      $('.notificationapi-preferences-popup > .notificationapi-loading')
    ).toHaveLength(1);
  });
});

describe('inline mode', () => {
  test('gives an error when parent does not exist', () => {
    notificationapi.showUserPreferences({ parent: 'does-not-exist-id' });
    expect(spy.mock.calls).toEqual([
      ['There are no HTML elements with id="does-not-exist-id" on the page.']
    ]);
  });
  test('adds the notificationapi preferences container to the parent div with an inline style', () => {
    notificationapi.showUserPreferences({ parent: 'root' });
    expect(
      $(
        'body > div#root > div[class="notificationapi-preferences-container inline"]'
      )
    ).toHaveLength(1);
  });
});

describe('preferences requests', () => {
  test('given no WS, throws no error', async () => {
    notificationapi = new NotificationAPI({
      clientId,
      userId,
      websocket: false
    });
    notificationapi.showUserPreferences();
    expect(spy.mock.calls).toEqual([]);
  });

  test('requests GET /enduser/preferences', async () => {
    notificationapi.showUserPreferences();
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toEqual(
      'https://api.notificationapi.com/enduser/preferences'
    );
    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toEqual('GET');
  });

  test('given preferences, calls renderPreferences function with preference objects', async () => {
    const mock = jest.spyOn(notificationapi, 'renderPreferences');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          preferences: [
            {
              notificationId: 'test-notificationId',
              channel: 'EMAIL',
              delivery: 'instant'
            }
          ],
          notifications: [
            {
              notificationId: 'test-notificationId',
              title: 'test-title'
            }
          ],
          subNotifications: []
        })
    });
    notificationapi.showUserPreferences();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mock).toHaveBeenCalledWith([
      {
        notificationId: 'test-notificationId',
        title: 'test-title',
        settings: [
          {
            channel: 'EMAIL',
            channelName: 'Email',
            state: true
          }
        ]
      }
    ]);
  });

  test('a failed preferences request does not call renderPreferences', async () => {
    const mock = jest.spyOn(notificationapi, 'renderPreferences');
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    notificationapi.showUserPreferences();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mock).toHaveBeenCalledTimes(0);
  });

  test('given preference, clicking toggle changes the toggle and sends correct patch request', async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([emailInAppPreference]);
    $(
      '.notificationapi-preferences-toggle[data-channel="EMAIL"] input'
    ).trigger('click');

    expect(
      $(
        '.notificationapi-preferences-toggle[data-channel="EMAIL"] input:not(:checked)'
      )
    ).toHaveLength(1);
    const posts = (global.fetch as jest.Mock).mock.calls.filter(
      (call) => call[1].method === 'POST'
    );
    expect(JSON.parse(posts[0][1].body)).toEqual([
      {
        notificationId: emailInAppPreference.notificationId,
        subNotificationId: '',
        channel: 'EMAIL',
        state: false
      }
    ]);
    $(
      '.notificationapi-preferences-toggle[data-channel="EMAIL"] input'
    ).trigger('click');
    expect(
      $(
        '.notificationapi-preferences-toggle[data-channel="EMAIL"] input:checked'
      )
    ).toHaveLength(1);
    const postsAfter = (global.fetch as jest.Mock).mock.calls.filter(
      (call) => call[1].method === 'POST'
    );
    expect(JSON.parse(postsAfter[1][1].body)).toEqual([
      {
        notificationId: emailInAppPreference.notificationId,
        subNotificationId: '',
        channel: 'EMAIL',
        state: true
      }
    ]);
  });

  test('given preference, clicking subtoggle changes the subtoggle and sends correct patch request', async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      {
        ...emailInAppPreference,
        subNotificationPreferences: [
          {
            ...emailInAppPreference,
            subNotificationId: 'subNotificationId1',
            title: 'subtitle1'
          }
        ]
      }
    ]);
    $(
      '.notificationapi-preferences-subtoggle[data-channel="EMAIL"] input'
    ).trigger('click');

    expect(
      $(
        '.notificationapi-preferences-subtoggle[data-channel="EMAIL"] input:not(:checked)'
      )
    ).toHaveLength(1);
    const posts = (global.fetch as jest.Mock).mock.calls.filter(
      (call) => call[1].method === 'POST'
    );
    expect(JSON.parse(posts[0][1].body)).toEqual([
      {
        notificationId: emailInAppPreference.notificationId,
        subNotificationId: 'subNotificationId1',
        channel: 'EMAIL',
        state: false
      }
    ]);
    $(
      '.notificationapi-preferences-subtoggle[data-channel="EMAIL"] input'
    ).trigger('click');
    expect(
      $(
        '.notificationapi-preferences-subtoggle[data-channel="EMAIL"] input:checked'
      )
    ).toHaveLength(1);
    const postsAfter = (global.fetch as jest.Mock).mock.calls.filter(
      (call) => call[1].method === 'POST'
    );
    expect(JSON.parse(postsAfter[1][1].body)).toEqual([
      {
        notificationId: emailInAppPreference.notificationId,
        subNotificationId: 'subNotificationId1',
        channel: 'EMAIL',
        state: true
      }
    ]);
  });
});

describe('renderPreferences', () => {
  test('before showUserPreferences(), does not throw', async () => {
    notificationapi.renderPreferences([]);
    expect(spy.mock.calls).toEqual([]);
  });

  test('given no preferences, removes loading & renders empty state', async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([]);
    expect($('.notification-loading')).toHaveLength(0);
    expect(
      $(
        '.notificationapi-preferences-popup > .notificationapi-preferences-empty'
      )
    ).toHaveLength(1);
  });

  test('given empty preferences repeatedly, removes loading & shows one empty state', async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([]);
    notificationapi.renderPreferences([]);
    expect($('.notification-loading')).toHaveLength(0);
    expect(
      $(
        '.notificationapi-preferences-popup > .notificationapi-preferences-empty'
      )
    ).toHaveLength(1);
  });

  test('given preference without channel, removes loading & shows empty state)', async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      {
        notificationId: 'test-notificationId',
        title: 'test-title',
        settings: []
      }
    ]);
    expect($('.notification-loading')).toHaveLength(0);
    expect(
      $(
        '.notificationapi-preferences-popup > .notificationapi-preferences-empty'
      )
    ).toHaveLength(1);
  });

  test('given preference, adds grid to popup', () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([emailInAppPreference]);
    expect(
      $(
        '.notificationapi-preferences-popup > .notificationapi-preferences-grid'
      )
    ).toHaveLength(1);
  });
  test('given preference, adds grid to popup and no extra message', () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([emailInAppPreference]);
    expect(
      $(
        '.notificationapi-preferences-popup > .notificationapi-preferences-grid'
      )
    ).toHaveLength(1);
    expect(
      $(
        '.notificationapi-preferences-popup > .notificationapi-preferences-message'
      )
    ).toHaveLength(0);
  });

  test(`given email/inapp and inapp/sms preference, adds email/inapp/sms headers to grid`, async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      emailInAppPreference,
      inappSMSPreference
    ]);
    expect(
      $(
        '.notificationapi-preferences-grid > .notificationapi-preferences-channel'
      )
    ).toHaveLength(3);
    expect(
      $(
        '.notificationapi-preferences-channel.notificationapi-preferences-col2.notificationapi-preferences-row1'
      )[0].innerHTML
    ).toEqual('Email');
    expect(
      $(
        '.notificationapi-preferences-channel.notificationapi-preferences-col3.notificationapi-preferences-row1'
      )[0].innerHTML
    ).toEqual('In-App (Web)');
    expect(
      $(
        '.notificationapi-preferences-channel.notificationapi-preferences-col4.notificationapi-preferences-row1'
      )[0].innerHTML
    ).toEqual('SMS');
  });

  test(`given two simple preferences, adds titles and toggles based on channel state to grid`, async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      emailInAppPreference,
      inappSMSPreference
    ]);
    expect(
      $(
        '.notificationapi-preferences-grid > .notificationapi-preferences-title'
      )
    ).toHaveLength(2);
    expect($('.notificationapi-preferences-title')[0].innerHTML).toEqual(
      'title1'
    );
    expect($('.notificationapi-preferences-title')[1].innerHTML).toEqual(
      'title2'
    );
    expect(
      $(
        '.notificationapi-preferences-grid > .notificationapi-preferences-toggle'
      )
    ).toHaveLength(4);
    expect(
      $(
        '.notificationapi-preferences-toggle.notificationapi-preferences-col2.notificationapi-preferences-row2[data-notificationId="notificationId1"][data-channel="EMAIL"] input:checked'
      )
    ).toHaveLength(1);
    expect(
      $(
        '.notificationapi-preferences-toggle.notificationapi-preferences-col3.notificationapi-preferences-row2[data-notificationId="notificationId1"][data-channel="INAPP_WEB"] input:not(:checked)'
      )
    ).toHaveLength(1);
    expect(
      $(
        '.notificationapi-preferences-toggle.notificationapi-preferences-col3.notificationapi-preferences-row3[data-notificationId="notificationId2"][data-channel="INAPP_WEB"] input:not(:checked)'
      )
    ).toHaveLength(1);
    expect(
      $(
        '.notificationapi-preferences-toggle.notificationapi-preferences-col4.notificationapi-preferences-row3[data-notificationId="notificationId2"][data-channel="SMS"] input:checked'
      )
    ).toHaveLength(1);
  });

  test('does not show expand button if subNotificationPreferences is empty', () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      { ...emailInAppPreference, subNotificationPreferences: [] }
    ]);
    expect(
      $(
        '.notificationapi-preferences-grid > .notificationapi-preferences-expand'
      )
    ).toHaveLength(0);
  });

  test(`given a complex preference, adds expand button, subtitles and subtoggles to grid`, async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      {
        ...emailInAppPreference,
        subNotificationPreferences: [
          {
            ...emailInAppPreference,
            subNotificationId: 'subNotificationId1',
            title: 'subtitle1'
          },
          {
            ...emailInAppPreference,
            subNotificationId: 'subNotificationId2',
            title: 'subtitle2'
          }
        ]
      }
    ]);

    expect(
      $(
        '.notificationapi-preferences-grid > .notificationapi-preferences-expand'
      )
    ).toHaveLength(1);
    expect(
      $(
        '.notificationapi-preferences-grid > .notificationapi-preferences-subtitle'
      )
    ).toHaveLength(2);
    expect($('.notificationapi-preferences-subtitle')[0].innerHTML).toEqual(
      'subtitle1'
    );
    expect($('.notificationapi-preferences-subtitle')[1].innerHTML).toEqual(
      'subtitle2'
    );
    expect(
      $(
        '.notificationapi-preferences-grid > .notificationapi-preferences-subtoggle'
      )
    ).toHaveLength(4);
    expect(
      $(
        '.notificationapi-preferences-subtoggle.notificationapi-preferences-col2.notificationapi-preferences-row3[data-notificationId="notificationId1"][data-subNotificationId="subNotificationId1"][data-channel="EMAIL"] input:checked'
      )
    ).toHaveLength(1);
    expect(
      $(
        '.notificationapi-preferences-subtoggle.notificationapi-preferences-col3.notificationapi-preferences-row3[data-notificationId="notificationId1"][data-subNotificationId="subNotificationId1"][data-channel="INAPP_WEB"] input:not(:checked)'
      )
    ).toHaveLength(1);
    expect(
      $(
        '.notificationapi-preferences-subtoggle.notificationapi-preferences-col2.notificationapi-preferences-row4[data-notificationId="notificationId1"][data-subNotificationId="subNotificationId2"][data-channel="EMAIL"] input:checked'
      )
    ).toHaveLength(1);
    expect(
      $(
        '.notificationapi-preferences-subtoggle.notificationapi-preferences-col3.notificationapi-preferences-row4[data-notificationId="notificationId1"][data-subNotificationId="subNotificationId2"][data-channel="INAPP_WEB"] input:not(:checked)'
      )
    ).toHaveLength(1);
  });

  test(`subtitles and subtoggles are .closed by default`, async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      {
        ...emailInAppPreference,
        subNotificationPreferences: [
          {
            ...emailInAppPreference,
            subNotificationId: 'subNotificationId1',
            title: 'subtitle1'
          }
        ]
      }
    ]);

    expect($('.notificationapi-preferences-subtitle.closed')).toHaveLength(1);
    expect($('.notificationapi-preferences-subtoggle.closed')).toHaveLength(2);
  });

  test(`after expand is clicked, relevant subtitles and subtoggles lose .closed`, async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      {
        ...emailInAppPreference,
        subNotificationPreferences: [
          {
            ...emailInAppPreference,
            subNotificationId: 'subNotificationId1',
            title: 'subtitle1'
          },
          {
            ...emailInAppPreference,
            subNotificationId: 'subNotificationId2',
            title: 'subtitle2'
          }
        ]
      },
      {
        ...inappSMSPreference,
        subNotificationPreferences: [
          {
            ...inappSMSPreference,
            subNotificationId: 'subNotificationId1',
            title: 'subtitle3'
          },
          {
            ...inappSMSPreference,
            subNotificationId: 'subNotificationId2',
            title: 'subtitle4'
          }
        ]
      }
    ]);

    $(
      '.notificationapi-preferences-expand[data-notificationId="notificationId1"]'
    ).trigger('click');
    expect(
      $(
        '.notificationapi-preferences-subtitle[data-notificationId="notificationId1"]:not(.closed)'
      )
    ).toHaveLength(2);
    expect(
      $(
        '.notificationapi-preferences-subtoggle[data-notificationId="notificationId1"]:not(.closed)'
      )
    ).toHaveLength(4);
    expect(
      $(
        '.notificationapi-preferences-subtitle[data-notificationId="notificationId2"].closed'
      )
    ).toHaveLength(2);
    expect(
      $(
        '.notificationapi-preferences-subtoggle[data-notificationId="notificationId2"].closed'
      )
    ).toHaveLength(4);
  });

  test('subtoggles are active for enabled notifications and inactive for disabled notifications', async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      {
        ...emailInAppPreference,
        subNotificationPreferences: [
          {
            ...emailInAppPreference,
            subNotificationId: 'subNotificationId1',
            title: 'subtitle1'
          }
        ]
      }
    ]);

    expect(
      $('.notificationapi-preferences-subtoggle input:disabled')
    ).toHaveLength(1);
    expect(
      $('.notificationapi-preferences-subtoggle input:not(:disabled)')
    ).toHaveLength(1);
  });

  test('clicking toggle changes the disabled state of subtoggles', async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([
      {
        ...emailInAppPreference,
        subNotificationPreferences: [
          {
            ...emailInAppPreference,
            subNotificationId: 'subNotificationId1',
            title: 'subtitle1'
          }
        ]
      }
    ]);

    $(
      '.notificationapi-preferences-toggle[data-channel="EMAIL"] input'
    ).trigger('click');

    expect(
      $(
        '.notificationapi-preferences-subtoggle[data-channel="EMAIL"] input:disabled'
      )
    ).toHaveLength(1);

    $(
      '.notificationapi-preferences-toggle[data-channel="EMAIL"] input'
    ).trigger('click');

    expect(
      $(
        '.notificationapi-preferences-subtoggle[data-channel="EMAIL"] input:not(:disabled)'
      )
    ).toHaveLength(1);
  });

  test(`given preferences repeatedly, removes old preferences and renders new preferences`, async () => {
    notificationapi.showUserPreferences();
    notificationapi.renderPreferences([emailInAppPreference]);
    expect($('.notificationapi-preferences-title')[0].innerHTML).toEqual(
      'title1'
    );

    notificationapi.renderPreferences([inappSMSPreference]);
    expect($('.notificationapi-preferences-title')[0].innerHTML).toEqual(
      'title2'
    );
  });
});
