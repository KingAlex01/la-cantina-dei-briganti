// Limita gli invii ripetuti del modulo pubblico per indirizzo IP.
// La prenotazione continua a essere gestita dalla route Next.js.
export default function bookingRateLimit(_request, context) {
  return context.next();
}

export const config = {
  path: "/api/public/reservations",
  method: "POST",
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
