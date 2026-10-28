// Razorpay's callback_url after checkout. Bounces the browser back into the app; the app
// then asks payments-verify, so nothing in this redirect is trusted.
Deno.serve(() => new Response(null, { status: 302, headers: { Location: 'yuvomeet://payments' } }));
