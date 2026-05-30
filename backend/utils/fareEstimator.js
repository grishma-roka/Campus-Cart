/**
 * Fare Estimator — fuel-optimized pricing
 * Base fare: Rs. 40 (covers pickup + first km)
 * Per km after first: Rs. 15
 *
 * Distance is estimated by counting distinct words/tokens shared between
 * the two location strings. Same campus area = ~0.5 km, different blocks = ~1-3 km.
 * This is a text-similarity heuristic since we don't have geocoding keys.
 */

const BASE_FARE = 40;
const PER_KM_RATE = 15;

/**
 * Estimate distance in km between two text-based location strings.
 * Uses token overlap as a proxy — same building/block = closer.
 */
function estimateDistanceKm(pickup, delivery) {
  if (!pickup || !delivery) return 1.5; // default fallback

  const tokenize = (str) =>
    str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  const pickupTokens = new Set(tokenize(pickup));
  const deliveryTokens = new Set(tokenize(delivery));

  // Count shared tokens
  let shared = 0;
  for (const t of deliveryTokens) {
    if (pickupTokens.has(t)) shared++;
  }

  const totalUnique = new Set([...pickupTokens, ...deliveryTokens]).size;
  const similarity = totalUnique > 0 ? shared / totalUnique : 0;

  // High similarity = same area = short distance
  // Low similarity = different areas = longer distance
  if (similarity >= 0.6) return 0.5;
  if (similarity >= 0.4) return 1.0;
  if (similarity >= 0.2) return 2.0;
  if (similarity >= 0.1) return 3.5;
  return 5.0;
}

/**
 * Calculate delivery fee from pickup to delivery location.
 * @param {string} pickupLocation - seller's pickup address
 * @param {string} deliveryAddress - buyer's delivery address
 * @returns {{ distance_km: number, delivery_fee: number }}
 */
function estimateDelivery(pickupLocation, deliveryAddress) {
  const distance_km = estimateDistanceKm(pickupLocation, deliveryAddress);
  const extra_km = Math.max(0, distance_km - 1);
  const delivery_fee = Math.round(BASE_FARE + extra_km * PER_KM_RATE);

  return { distance_km, delivery_fee };
}

module.exports = { estimateDelivery };
