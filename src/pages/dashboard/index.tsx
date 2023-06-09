import type { NextPage } from "next";
import { signOut } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import { api } from "~/utils/api";

const SignoutButton = () => {
  return (
    <button
      className="w-fit cursor-pointer rounded-md bg-red-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-red-600"
      onClick={() => {
        void signOut({ callbackUrl: "/" });
      }}
    >
      Sign out
    </button>
  );
};

const UpgradeButton = () => {
  const { mutateAsync: createCheckoutSession } =
    api.stripe.createCheckoutSession.useMutation();
  const { push } = useRouter();
  return (
    <button
      className="w-fit cursor-pointer rounded-md bg-blue-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-blue-600"
      onClick={async () => {
        const { checkoutUrl } = await createCheckoutSession("basic");
        if (checkoutUrl) {
          void push(checkoutUrl);
        }
      }}
    >
      Upgrade account
    </button>
  );
};

const ManageBillingButton = () => {
  const { mutateAsync: createBillingPortalSession } =
    api.stripe.createBillingPortalSession.useMutation();
  const { push } = useRouter();

  return (
    <button
      className="w-fit cursor-pointer rounded-md bg-blue-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-blue-600"
      onClick={async () => {
        const { billingPortalUrl } = await createBillingPortalSession();
        if (billingPortalUrl) {
          push(billingPortalUrl);
        }
      }}
    >
      Manage subscription and billing
    </button>
  );
};

const Dashboard: NextPage = () => {
  const { data: subscriptionStatus, isLoading } =
    api.users.subscriptionStatus.useQuery();

  return (
    <>
      <Head>
        <title>T3 Stripe</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-5xl font-extrabold leading-normal text-gray-700">
          T3 <span className="text-[#5433FF]">Stripe</span> Dashboard
        </h1>
        <p className="text-2xl text-gray-700">Actions:</p>
        <div className="mt-3 flex flex-col items-center justify-center gap-4">
          <SignoutButton />
          {!isLoading && subscriptionStatus !== null && (
            <>
              <p className="text-xl text-gray-700">
                Your subscription is {subscriptionStatus}.
              </p>
              <ManageBillingButton />
            </>
          )}
          {!isLoading && subscriptionStatus === null && (
            <>
              <p className="text-xl text-gray-700">You are not subscribed!!!</p>
              <UpgradeButton />
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default Dashboard;
