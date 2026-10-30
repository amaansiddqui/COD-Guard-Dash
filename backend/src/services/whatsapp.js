import crypto from 'node:crypto';

const money = (value) => `₹${Number(value).toFixed(0)}`;

export function buildInitialMessage(session, order) {
  const lang = session.language || 'hinglish';
  const name = order.customer_name || 'Customer';
  const amount = money(order.order_value || 0);
  const address = [order.address, order.city, order.state, order.pincode].filter(Boolean).join(', ');
  if (session.flow === 'NUDGE') {
    const discounted = Number(order.order_value || 0) - Number(session.discount || 20);
    if (lang === 'english') return `Hi ${name}, pay online for order ${order.order_id} and get ${money(session.discount)} off. Your total will be ${money(discounted)}. Reply YES for a secure payment link or NO to continue with COD. No reply within 24 hours means the order is put on hold.`;
    if (lang === 'hindi') return `Namaste ${name}! Order ${order.order_id} ka online payment karne par ${money(session.discount)} ki chhoot milegi. Aapko ${money(discounted)} dene honge. Payment link ke liye YES ya COD jaari rakhne ke liye NO bhejein. 24 ghante mein jawab na milne par order hold hoga.`;
    return `Namaste ${name}! Order ${order.order_id} ka online payment karne par ${money(session.discount)} off milega. Aapko sirf ${money(discounted)} pay karne honge. Secure payment link ke liye YES, ya COD continue karne ke liye NO reply karein. 24 hours mein reply nahi aaya to order hold rahega.`;
  }
  if (lang === 'english') return `Hi ${name}, please confirm COD order ${order.order_id} for ${amount} at this address: ${address}. Reply YES to confirm dispatch or NO to cancel. No reply within 24 hours means the order is put on hold.`;
  if (lang === 'hindi') return `Namaste ${name}! Kya aap ${amount} ka order ${order.order_id} is pate par mangwana chahte hain: ${address}? Bhejne ke liye YES aur cancel karne ke liye NO likhein. 24 ghante mein jawab na milne par order hold hoga.`;
  return `Namaste ${name}! Aapka COD order ${order.order_id} (${amount}) is address par bhejna hai: ${address}. Confirm karne ke liye YES aur cancel karne ke liye NO reply karein. 24 hours mein reply nahi aaya to order hold rahega.`;
}

export function createSession(order, action, language = 'hinglish', discount = 20) {
  const flow = action === 'NUDGE' ? 'NUDGE' : 'CONFIRM';
  const session = {
    session_id: crypto.randomUUID(),
    order_id: order.order_id,
    order,
    flow,
    language,
    discount,
    status: flow === 'NUDGE' ? 'PREPAID_OFFER_SENT' : 'AWAITING_CONFIRMATION',
    messages: [],
    clarification_sent: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  session.messages.push({ from: 'business', text: buildInitialMessage(session, order), at: session.created_at });
  return session;
}

export function handleReply(session, rawReply) {
  const reply = String(rawReply || '').trim().toLowerCase();
  const yes = ['yes', 'y', 'haan', 'han', 'ha', 'ji', 'confirm', 'ok', 'okay'].includes(reply);
  const no = ['no', 'n', 'nahi', 'nahin', 'cancel'].includes(reply);
  const now = new Date().toISOString();
  session.messages.push({ from: 'customer', text: String(rawReply), at: now });

  if (session.status === 'PAYMENT_PENDING' || session.status === 'PAYMENT_CONFIRMED_TO_SHIP' || session.status === 'CONFIRMED_TO_SHIP' || session.status === 'CANCELLED_BY_CUSTOMER' || session.status === 'ON_HOLD_24H') {
    session.messages.push({ from: 'business', text: 'This order flow is already closed or waiting for payment verification. Please contact support if you need help.', at: now });
  } else if (session.flow === 'NUDGE' && session.status === 'PREPAID_OFFER_SENT') {
    if (yes) {
      session.status = 'PAYMENT_PENDING';
      session.payment_link = `https://pay.example.test/${session.session_id.slice(0, 8)}`;
      session.messages.push({ from: 'business', text: `Here is your mock payment link: ${session.payment_link}. We will dispatch only after payment confirmation.`, at: now });
    } else if (no) {
      session.flow = 'CONFIRM';
      session.status = 'AWAITING_CONFIRMATION';
      session.messages.push({ from: 'business', text: buildInitialMessage(session, session.order), at: now });
    } else {
      sendClarification(session, now);
    }
  } else if (session.status === 'AWAITING_CONFIRMATION') {
    if (yes) {
      session.status = 'CONFIRMED_TO_SHIP';
      session.messages.push({ from: 'business', text: 'Thank you. Your COD order is confirmed and can be released to fulfilment.', at: now });
    } else if (no) {
      session.status = 'CANCELLED_BY_CUSTOMER';
      session.messages.push({ from: 'business', text: 'Your order has been cancelled as requested. No parcel will be dispatched.', at: now });
    } else {
      sendClarification(session, now);
    }
  }
  session.updated_at = now;
  return session;
}

function sendClarification(session, now) {
  if (!session.clarification_sent) {
    session.clarification_sent = true;
    session.messages.push({ from: 'business', text: 'Sorry, I could not understand that. Please reply only YES or NO so we can process your order correctly.', at: now });
  } else {
    session.status = 'ON_HOLD_MANUAL_REVIEW';
    session.messages.push({ from: 'business', text: 'We still could not confirm your choice. The order is on hold for our support team; it will not be dispatched automatically.', at: now });
  }
}

export function timeoutSession(session) {
  if (['CONFIRMED_TO_SHIP', 'CANCELLED_BY_CUSTOMER', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED_TO_SHIP'].includes(session.status)) return session;
  const now = new Date().toISOString();
  session.status = 'ON_HOLD_24H';
  session.messages.push({ from: 'system', text: '24-hour timer expired. Order placed on hold for manual review; silence is not treated as consent.', at: now });
  session.updated_at = now;
  return session;
}

export function confirmPayment(session) {
  if (session.status !== 'PAYMENT_PENDING') throw new Error('There is no pending prepaid payment for this order.');
  const now = new Date().toISOString();
  session.status = 'PAYMENT_CONFIRMED_TO_SHIP';
  session.messages.push({ from: 'system', text: 'Mock payment webhook received: payment verified. Order may now be released to fulfilment.', at: now });
  session.updated_at = now;
  return session;
}
