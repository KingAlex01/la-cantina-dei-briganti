// The database also enforces a persistent limit across function instances.
export default function bookingManagementRateLimit(_request, context) {
  return context.next();
}

export const config = {
  path: "/api/public/reservations/manage",
  method: "POST",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
