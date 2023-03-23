import { env } from "../../env.mjs";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import type Stripe from "stripe";
import { buffer } from "micro";
import { stripe } from "../../server/stripe/client";
import { handleInvoicePaid, handleSubscriptionCanceled, handleSubscriptionCreatedOrUpdated } from "../../server/stripe/stripe-webhook-handlers";

export const config = {
    api: {
        bodyParser: false,
    },
};

const webhookSecret = env.STRIPE_WEBHOOK_SECRET;


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        res.status(405).end("Method not allowed");
        return;
    }

    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"];

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig as string, webhookSecret);

        switch (event.type) {
            case "invoice.paid":
                await handleInvoicePaid({
                    event,
                    stripe,
                    prisma,
                });
                break;
            case "customer.subscription.created":
                await handleSubscriptionCreatedOrUpdated({
                    event,
                    prisma,
                })
                break;
            case "customer.subscription.updated":
                await handleSubscriptionCreatedOrUpdated({
                    event,
                    prisma,
                });
                break;
            case "invoice.payment_failed":
                break;
            case "customer.subscription.deleted":
                await handleSubscriptionCanceled({
                    event,
                    prisma,
                });
                break;
            default:
                return res.status(400).send(`Unhandled event type ${event.type}`);

        }
        await prisma.stripeEvent.create({
            data: {
                id: event.id,
                type: event.type,
                object: event.object,
                api_version: event.api_version,
                account: event.account,
                created: new Date(event.created * 1000), // convert to milliseconds
                data: {
                    object: event.data.object,
                    previous_attributes: event.data.previous_attributes,
                },
                livemode: event.livemode,
                pending_webhooks: event.pending_webhooks,
                request: {
                    id: event.request?.id,
                    idempotency_key: event.request?.idempotency_key,
                },
            },
        });

        res.json({ received: true });

    } catch (err) {
        return res.status(400).send(err);
    }

}