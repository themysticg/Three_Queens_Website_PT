/** Same window as Admin "Members online" and broadcast → online-on-site audience. */
export const MEMBER_ONLINE_WINDOW_MINUTES = 5;

export function memberOnlineSince(): Date {
  return new Date(Date.now() - MEMBER_ONLINE_WINDOW_MINUTES * 60 * 1000);
}
