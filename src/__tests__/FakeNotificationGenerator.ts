import { InappNotification } from '../interfaces';

export const generateFakeNotifications = (
  count: number
): InappNotification[] => {
  const result = [];
  for (let index = 0; index < count; index++) {
    result.push({
      id: 'fake-' + index.toString(),
      seen: false,
      title: `<b>Ada</b> posted an update: A notification arrived.` + index,
      redirectURL: '#',
      imageURL: 'https://example.com/avatar.png',
      date: new Date(new Date().getTime() - index * 3600).toISOString()
    });
  }

  return result;
};
