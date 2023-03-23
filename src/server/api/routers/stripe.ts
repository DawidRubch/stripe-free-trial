import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getOrCreateStripeCustomerIdForUser } from "~/server/stripe/stripe-webhook-handlers";

const planValidation = z.enum(["basic", "premium", "platinum"]);


const PRICE_ID = {
    basic: env.STRIPE_BASIC_PRICE_ID,
    premium: env.STRIPE_PREMIUM_PRICE_ID,
    platinum: env.STRIPE_PLATINUM_PRICE_ID,
}

export const stripeRouter = createTRPCRouter({
    createCheckoutSession: protectedProcedure.input(planValidation).mutation(async ({ ctx, input }) => {
        const { stripe, session, prisma, req } = ctx;

        const customer = await getOrCreateStripeCustomerIdForUser({
            prisma,
            stripe,
            userId: session.user?.id,
        });

        if (!customer) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not create stripe customer",
            })
        }

        const customerId = customer.customerId;

        if (customer.doesHaveAnActiveSubscription) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "We can't create a new subscription for you, because you already have an active subscription."
            })
        }

        const baseUrl =
            env.NODE_ENV === "development"
                ? `http://${req.headers.host ?? "localhost:3000"}`
                : `https://${req.headers.host ?? env.NEXTAUTH_URL}`;

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            client_reference_id: session.user?.id,
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    price: PRICE_ID[input],
                    quantity: 1,
                }
            ],
            success_url: `${baseUrl}/dashboard?checkoutSuccess=true`,
            cancel_url: `${baseUrl}/dashboard?checkoutCanceled=true`,
            subscription_data: {
                metadata: {
                    userId: session.user?.id,
                    plan: input,
                },
                trial_period_days: 14,
            },

        });

        if (!checkoutSession) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not create checkout session",
            })
        }

        return { checkoutUrl: checkoutSession.url };
    }),
    createBillingPortalSession: protectedProcedure.mutation(async ({ ctx, input }) => {
        const { stripe, session, prisma, req } = ctx;

        const customer = await getOrCreateStripeCustomerIdForUser({
            prisma,
            stripe,
            userId: session.user?.id,
        });

        if (!customer) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not create stripe customer",
            })
        }

        const customerId = customer.customerId;

        const baseUrl =
            env.NODE_ENV === "development"
                ? `http://${req.headers.host ?? "localhost:3000"}`
                : `https://${req.headers.host ?? env.NEXTAUTH_URL}`;

        const stripeBillingPortalSession =
            await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${baseUrl}/dashboard`,
            });

        if (!stripeBillingPortalSession) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not create a billing portal session",
            })
        }

        return { billingPortalUrl: stripeBillingPortalSession.url };
    }),
    updateSubscription: protectedProcedure.input(planValidation).mutation(async ({ ctx, input }) => {
        const { stripe, session, prisma } = ctx;

        const user = await prisma.user.findUnique({
            where: {
                id: session.user?.id,
            },
            select: {
                stripeSubscriptionId: true,
                stripeSubscriptionPlan: true
            }
        })

        if (!user || !user.stripeSubscriptionId) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Could not find user",
            })
        }

        if (user.stripeSubscriptionPlan === input) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Subscription plan is already set to this",
            })
        }

        const stripeSubId = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);


        if (!stripeSubId.items.data[0]?.id) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not find subscription item",
            })
        }


        const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
            items: [
                {
                    id: stripeSubId.items.data[0]?.id,
                    price: PRICE_ID[input],
                }
            ]
        })

        if (!subscription) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not update subscription",
            })
        }


        await prisma.user.update({
            where: {
                id: session.user?.id,
            },
            data: {
                stripeSubscriptionPlan: input,
            }
        })

        return subscription
    })
});