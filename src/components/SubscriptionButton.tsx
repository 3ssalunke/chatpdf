import React from "react";
import { Button } from "./ui/button";

type Props = { isPro: boolean };

const SubscriptionButton = ({ isPro }: Props) => {
  return (
    <Button variant="outline">
      {isPro ? "Manage Subscriptions" : "Get Pro"}
    </Button>
  );
};

export default SubscriptionButton;
