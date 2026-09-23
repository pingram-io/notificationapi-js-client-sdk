import { faker } from '@faker-js/faker';

export const generateFakeNotifications = (count) => {
  const result = [];
  for (let index = 0; index < count; index++) {
    result.push({
      id: index,
      seen: faker.datatype.boolean(),
      title:
        `<b>${faker.person.firstName()}</b> posted an update: ${faker.lorem.sentence()}` +
        index,
      redirectURL: '#',
      imageURL: faker.image.avatar(),
      date: faker.date.past()
    });
  }
  return result;
};
