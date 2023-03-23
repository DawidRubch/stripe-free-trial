
import { TRPCError } from "@trpc/server";

import {
    createTRPCRouter, protectedProcedure
} from "~/server/api/trpc";

export const usersRouter = createTRPCRouter({
    subscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
        const { session, prisma } = ctx;

        const data = await prisma.user.findUnique({
            where: {
                id: session.user?.id,
            },
            select: {
                stripeSubscriptionStatus: true,
            },
        });

        if (!data) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Could not find user",
            })
        }
        return data.stripeSubscriptionStatus;
    }),
    subscriptionPlan: protectedProcedure.query(async ({ ctx }) => {
        const { session, prisma } = ctx;


        const data = await prisma.user.findUnique({
            where: {
                id: session.user?.id,
            },
            select: {
                stripeSubscriptionPlan: true,
            },
        });

        if (!data) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Could not find user",
            })
        }


        return data.stripeSubscriptionPlan === null ? "Free" : data.stripeSubscriptionPlan;
    })
});
