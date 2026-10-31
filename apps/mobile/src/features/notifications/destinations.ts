import type { Href } from 'expo-router';
import type { IconName } from '../../ui';
import type { Notification } from './api';

interface Meta {
  icon: IconName;
  href?: Href;
  action?: string;
}

/** Icon and destination for each notification kind written by the database triggers. */
export function notificationMeta(n: Notification): Meta {
  const plan = n.plan_id ? ({ pathname: '/plan/[id]', params: { id: n.plan_id } } as const) : undefined;
  switch (n.kind) {
    case 'join_request':
      return { icon: 'person-add-alt', href: n.plan_id ? { pathname: '/plan/[id]/requests', params: { id: n.plan_id } } : undefined, action: 'Review' };
    case 'join_approved':
      return { icon: 'how-to-reg', href: plan, action: 'View plan' };
    case 'join_declined':
    case 'join_expired':
      return { icon: 'person-off', href: '/' as Href, action: 'Find another plan' };
    case 'plan_cancelled':
      return { icon: 'event-busy', href: plan };
    case 'rating_prompt':
      return { icon: 'rate-review', href: n.plan_id ? { pathname: '/plan/[id]/rate', params: { id: n.plan_id } } : undefined, action: 'Rate' };
    case 'verification_passed':
      return { icon: 'verified-user' };
    case 'verification_review':
      return { icon: 'hourglass-top', href: '/verify/result' };
    case 'verification_rejected':
      return { icon: 'gpp-bad', href: '/verify/result', action: 'See options' };
    case 'account_suspended':
      return { icon: 'block' };
    case 'account_restored':
      return { icon: 'lock-open' };
    case 'premium_started':
      return { icon: 'workspace-premium', href: '/premium' as Href };
    case 'friend_request':
      return {
        icon: 'person-add-alt',
        href: n.actor_id ? ({ pathname: '/user/[id]', params: { id: n.actor_id } } as const) : undefined,
        action: 'View request',
      };
    case 'friend_accepted':
      return {
        icon: 'how-to-reg',
        href: n.actor_id ? ({ pathname: '/user/[id]', params: { id: n.actor_id } } as const) : undefined,
        action: 'View profile',
      };
    case 'mention':
      return {
        icon: 'chat',
        href: n.conversation_id ? ({ pathname: '/chat/[id]', params: { id: n.conversation_id } } as const) : undefined,
        action: 'Open chat',
      };
    default:
      return n.kind.startsWith('appeal_') ? { icon: 'gavel', href: '/settings/appeals' } : { icon: 'notifications-none', href: plan };
  }
}
