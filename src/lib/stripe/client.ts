import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/stripe/config";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }

  return stripeClient;
}
