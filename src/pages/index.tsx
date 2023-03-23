import { type NextPage } from "next";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

const Home: NextPage = () => {
  const session = useSession();

  return (
    <>
      <main>
        {session.status === "authenticated" && (
          <>
            <SubscriptionStatus></SubscriptionStatus>
            <SubscriptionShop></SubscriptionShop>
            <SubscriptionUpdate></SubscriptionUpdate>
            <BillingPortalSession></BillingPortalSession>
          </>
        )}

        <AuthButton />
      </main>
    </>
  );
};

export default Home;

const SubscriptionUpdate = () => {
  const { data: currentSubscription } = api.users.subscriptionPlan.useQuery();
  const { mutateAsync: updateSubscription } =
    api.stripe.updateSubscription.useMutation();

  const session = useSession();

  if (
    session.status !== "authenticated" ||
    !currentSubscription ||
    currentSubscription === "Free"
  )
    return null;

  return (
    <div>
      {currentSubscription !== "basic" && (
        <button
          className="w-fit cursor-pointer rounded-md bg-blue-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-blue-600"
          onClick={() => {
            updateSubscription("basic");
          }}
        >
          Upgrade to basic
        </button>
      )}
      {currentSubscription !== "premium" && (
        <button
          className="w-fit cursor-pointer rounded-md bg-blue-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-blue-600"
          onClick={() => {
            updateSubscription("premium");
          }}
        >
          Upgrade to premium
        </button>
      )}
      {currentSubscription !== "platinum" && (
        <button
          className="w-fit cursor-pointer rounded-md bg-blue-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-blue-600"
          onClick={() => {
            updateSubscription("platinum");
          }}
        >
          Upgrade to platinum
        </button>
      )}
    </div>
  );
};

const SubscriptionShop = () => {
  const { mutateAsync: createCheckoutSession } =
    api.stripe.createCheckoutSession.useMutation();

  const { push } = useRouter();

  const createABillingSession = async (
    plan: "basic" | "premium" | "platinum"
  ) => {
    const { checkoutUrl } = await createCheckoutSession(plan);
    if (checkoutUrl) {
      void push(checkoutUrl);
    }
  };

  const session = useSession();
  const { data: currentSubscription } = api.users.subscriptionPlan.useQuery();

  if (!currentSubscription) return null;

  if (session.status !== "authenticated" || currentSubscription !== "Free")
    return null;

  return (
    <div className="flex gap-2">
      <button
        className="w-fit cursor-pointer rounded-md bg-blue-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-blue-600"
        onClick={async () => {
          createABillingSession("basic");
        }}
      >
        Buy basic
      </button>
      <button
        className="w-fit cursor-pointer rounded-md bg-blue-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-blue-600"
        onClick={async () => {
          createABillingSession("premium");
        }}
      >
        Buy premium
      </button>
      <button
        className="w-fit cursor-pointer rounded-md bg-blue-500 px-5 py-2 text-lg font-semibold text-white shadow-sm duration-150 hover:bg-blue-600"
        onClick={async () => {
          createABillingSession("platinum");
        }}
      >
        Buy platinum
      </button>
    </div>
  );
};

const SubscriptionStatus = () => {
  const { data, isLoading } = api.users.subscriptionPlan.useQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Something went wrong</div>;
  }

  return (
    <div>
      <h2>Subscription status</h2>
      You are on: <strong>{data}</strong>
    </div>
  );
};

const AuthButton = () => {
  const { status } = useSession();

  const login = async () => {
    if (status === "unauthenticated") {
      void signIn();
    }
  };

  const logout = async () => {
    if (status === "authenticated") {
      void signOut({ callbackUrl: "/" });
    }
  };

  return (
    <button
      className="focus:shadow-outline my-5 inline-flex h-[44px] w-fit cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-[#333] px-5 py-3 text-sm text-white shadow-sm duration-150 hover:bg-black focus:outline-none disabled:cursor-not-allowed"
      onClick={status === "authenticated" ? logout : login}
      disabled={status === "loading"}
    >
      <span className="ml-2">
        {status === "authenticated" ? "Log out" : "Log in"}
      </span>
    </button>
  );
};

const BillingPortalSession = () => {
  const { mutateAsync: createBillingPortalSession } =
    api.stripe.createBillingPortalSession.useMutation();
  const { push } = useRouter();

  const { data: subscriptionStatus, isLoading } =
    api.users.subscriptionStatus.useQuery();

  if (!subscriptionStatus) {
    return <div>You haven't subscribe yet!</div>;
  }

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
