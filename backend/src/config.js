import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(__dirname, '..');
export const DATASET_PATH = path.join(BACKEND_ROOT, 'data', 'orders_sample.csv');
export const STATE_PATH = path.join(BACKEND_ROOT, 'data', 'app_state.json');
export const POLICY_PATH = path.join(BACKEND_ROOT, 'data', 'policy.json');

export const DEFAULT_POLICY = Object.freeze({
  ship_max_risk: 0.25,
  confirm_max_risk: 0.45,
  hold_risk_returning: 0.72,
  hold_risk_first_time: 0.88,
  confirmation_response_rate: 0.70,
  confirmation_rto_reduction: 0.50,
  prepaid_conversion_rate: 0.35,
  prepaid_rto_rate: 0.04,
  prepaid_discount: 20,
  gross_margin_rate: 0.62,
  average_order_value: 649,
  new_customer_cac: 300,
  forward_shipping: 65,
  return_shipping: 65,
  packaging_handling: 25,
  damage_rate: 0.08,
  returned_product_cost: 180
});

export function loadPolicyFile() {
  try {
    const saved = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
    return { ...DEFAULT_POLICY, ...saved };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export function savePolicyFile(policy) {
  fs.writeFileSync(POLICY_PATH, JSON.stringify(policy, null, 2));
}
