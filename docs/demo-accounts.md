# Demo accounts (dev project only)

Loaded by `supabase/seeds/demo.sql`. All are verified, active Kota members. Sign in from the
welcome screen with **Log in** (email + password).

Password for every account: `Hengout@123`

| Email | Name | Tier | Good for testing |
| ----- | ---- | ---- | ---------------- |
| rohan@demo.hengout.app | Rohan (man) | Premium | Hosting paid plans, earnings, payouts, priority requests, pending requests to review |
| priya@demo.hengout.app | Priya (woman) | Free | Hosting a free plan with requests, women-only plans, a paid seat on Rohan's plan |
| arjun@demo.hengout.app | Arjun (man) | Plus | Unlimited joins, board-game host with a full chat |
| ananya@demo.hengout.app | Ananya (woman) | Free | Weekly join cap, joining a fresh plan |
| vikram@demo.hengout.app | Vikram (man) | Premium | A pending request on a paid plan (approve as Rohan, then pay as Vikram) |

Other members (karan, sneha, isha, aditya, meera, rahul, kavya `@demo.hengout.app`) use the same password.

Razorpay test mode: on the checkout page use UPI `success@razorpay`, or card `4111 1111 1111 1111`
with any future expiry, any CVV and OTP `1234`.

Profile and venue photos aren't seeded (they go through the moderation upload flow), so avatars show initials.
