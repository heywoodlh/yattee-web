import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { archiveSubscriptions, parseTakeoutSubscriptions } from './subscriptions-import';

const csv = 'Channel Id,Channel Url,Channel Title\nUCabc,https://www.youtube.com/channel/UCabc,Example Channel\n';

describe('Google Takeout subscriptions import', () => {
  it('extracts channel identity and title from subscriptions.csv', () => {
    expect(parseTakeoutSubscriptions(csv)).toEqual([{ authorId: 'UCabc', author: 'Example Channel' }]);
  });
  it('reads subscriptions.csv from a ZIP archive', () => {
    const archive = zipSync({ 'Takeout/YouTube and YouTube Music/subscriptions/subscriptions.csv': strToU8(csv) });
    expect(archiveSubscriptions(archive, 'takeout.zip')).toEqual([{ authorId: 'UCabc', author: 'Example Channel' }]);
  });
});
