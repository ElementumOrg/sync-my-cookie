import _ from 'lodash';
import * as chromeUtil from './utils/chrome';
import { auto, AutoConfiguration, gist } from './utils/store';

const DEBOUNCE_DELAY = 10000;

/* tslint:disable no-console */

// Auto Merge
const handleAutoMerge = async () => {
  await gist.updateData()
  console.log('Auto merge running');
  const list = (await filterDomain('autoMerge')).map(([domain]) => domain);
  if (list.length === 0) {
    console.log('No domains need auto merge');
    return;
  }
  console.log(`Total ${list.length} domains need auto merge: ${list.join(',')}`);
  let done = 0;
  for (const domain of list) {
    const cookies = await gist.getCookies(domain);
    await chromeUtil.importCookies(cookies);
    done++;
    console.log(`[${done}/${list.length}] ${cookies.length} cookies for ${domain} have been merged`);
  }
  if (done) {
    badge(`↓${done}`);
  }
};

// Auto Push
const handleAutoPush = _.debounce(async () => {
  try {
    console.log('Auto push running');
    const list = await filterDomain('autoPush');
    if (list.length === 0) {
      console.log('No domains need auto push');
      return;
    }
    console.log(list);
    console.log(`${list.length} domains need auto push: ${list.map(([domain]) => domain).join(',')}`);
    const bulk: Array<{ domain: string, cookies: chrome.cookies.SetDetails[] }> = [];
    for (const [domain, config] of list) {
      console.log(`Processing domain ${domain}`);
      const newCookies = await chromeUtil.exportCookies(domain);
      const oldCookies = await gist.getCookies(domain);
      let rules: string[];
      if (config.autoPushName.length === 0) {
        console.log('No auto push rules configured for this domain, using all saved cookie names as rules by default');
        rules = _.uniq(oldCookies.map((cookie) => cookie.name as string));
      } else {
        console.log(`Auto push Name rules: ${config.autoPushName.join(',')}`);
        rules = config.autoPushName;
      }

      const oldCookiesFiltered = oldCookies.filter((cookie) => rules.includes(cookie.name as string));
      const newCookiesFiltered = newCookies.filter((cookie) => rules.includes(cookie.name as string));
      // Quantity test: both must have the same number
      console.log('Quantity test: both must have the same number');
      console.log(`After Name filter, old: ${oldCookiesFiltered.length}, new: ${newCookiesFiltered.length}`);
      if (oldCookiesFiltered.length !== newCookiesFiltered.length) {
        console.log('Quantity test failed, need to push');
        bulk.push({ domain, cookies: newCookies });
        continue;
      }
      console.log('Quantity test passed');

      // Convert cookie array to url##name => value, expirationDate object
      console.log('Converting cookie array to url##name => value, expirationDate object');
      const oldProcessed = _.mapValues(
        _.keyBy(oldCookiesFiltered, (cookie) => `${cookie.url}##${cookie.name}`),
        (cookie) => _.pick(cookie, ['value', 'expirationDate']),
      );
      const newProcessed = _.mapValues(
        _.keyBy(newCookiesFiltered, (cookie) => `${cookie.url}##${cookie.name}`),
        (cookie) => _.pick(cookie, ['value', 'expirationDate']),
      );
      console.log('Old processed', oldProcessed);
      console.log('New processed', newProcessed);

      // Key test: both must have exactly the same keys
      console.log('Key test: both must have exactly the same keys');
      if (!_.isEqual(Object.keys(oldProcessed).sort(), Object.keys(newProcessed).sort())) {
        console.log('Key test failed, need to push');
        bulk.push({ domain, cookies: newCookies });
        continue;
      }

      // Individual test: values must match, old expiration must not be less than 50% of new
      console.log('Key test passed');
      console.log('Individual test: values must match, old expiration must not be less than 50% of new');
      for (const key of Object.keys(oldProcessed)) {
        const oldOne = oldProcessed[key];
        const newOne = newProcessed[key];
        if (oldOne.value !== newOne.value) {
          console.log(`${key} value does not match, need to push`);
          bulk.push({ domain, cookies: newCookies });
          break;
        }
        const now = new Date().getTime() / 1000;
        const oldRemain = oldOne.expirationDate as number - now;
        const newRemain = newOne.expirationDate as number - now;
        if (oldRemain < newRemain * 0.5) {
          console.log(`Old expires in ${oldRemain} seconds`);
          console.log(`New expires in ${newRemain} seconds`);
          console.log(`${oldRemain} / ${newRemain} = ${oldRemain / newRemain} < 0.5`);
          console.log('Too old, not passing');
          bulk.push({ domain, cookies: newCookies });
          break;
        }
      }
      console.log('Individual test passed, no need to push');
    }
    console.log(`Total ${bulk.length} domains need to be pushed`);
    if (bulk.length) {
      await gist.set(bulk);
      badge(`↑${bulk.length}`, 'green');
    }
  } catch (err) {
    console.error(err);
    badge('err', 'black', 100000);
  }
}, DEBOUNCE_DELAY);

chrome.windows.onCreated.addListener(handleAutoMerge);
chrome.cookies.onChanged.addListener(handleAutoPush);

function badge(text: string, color: string = 'red', delay: number = 10000) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });

  const alarmName = `badge_clear_${Date.now()}`;
  chrome.alarms.create(alarmName, {
    delayInMinutes: delay / 60000
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('badge_clear_')) {
    chrome.action.setBadgeText({ text: '' });
  }
});

async function filterDomain(type: 'autoPush' | 'autoMerge'): Promise<Array<[string, AutoConfiguration]>> {
  let list: Array<[string, AutoConfiguration]>;
  if (type === 'autoPush') {
    list = await auto.getAutoPush();
  } else {
    list = await auto.getAutoMerge();
  }
  if (list.length) {
    const ready = await gist.init();
    if (!ready) {
      return [];
    }
  }
  return list;
}
