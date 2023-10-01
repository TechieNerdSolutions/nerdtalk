// Import necessary modules and types
import { Webhook, WebhookRequiredHeaders } from "svix";
import { headers } from "next/headers";
import { IncomingHttpHeaders } from "http";
import { NextResponse } from "next/server";
import {
  addMemberToCommunity,
  createCommunity,
  deleteCommunity,
  removeUserFromCommunity,
  updateCommunityInfo,
} from "@/lib/actions/community.actions";

// Define event types
type EventType =
  | "organization.created"
  | "organizationInvitation.created"
  | "organizationMembership.created"
  | "organizationMembership.deleted"
  | "organization.updated"
  | "organization.deleted";

type Event = {
  data: Record<string, string | number | Record<string, string>[]>;
  object: "event";
  type: EventType;
};

// Define the POST function
export const POST = async (request: Request): Promise<NextResponse> => {
  const payload = await request.json();
  const header = headers();

  const heads = {
    "svix-id": header.get("svix-id"),
    "svix-timestamp": header.get("svix-timestamp"),
    "svix-signature": header.get("svix-signature"),
  };

  // Initialize Webhook with the secret
  const wh = new Webhook(process.env.NEXT_CLERK_WEBHOOK_SECRET || "");

  let evnt: Event | null = null;

  try {
    // Verify the webhook payload
    evnt = wh.verify(
      JSON.stringify(payload),
      heads as IncomingHttpHeaders & WebhookRequiredHeaders
    ) as Event;
  } catch (err) {
    // Handle verification errors
    return NextResponse.json({ message: err }, { status: 400 });
  }

  // Handle different event types
  switch (evnt?.type) {
    case "organization.created":
      const { id, name, slug, logo_url, image_url, created_by } = evnt?.data ?? {};
      try {
        await createCommunity(id, name, slug, logo_url || image_url, "org bio", created_by);
        return NextResponse.json({ message: "User created" }, { status: 201 });
      } catch (err) {
        console.log(err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
      }

    // Handle other event types similarly

    default:
      // Return a 404 Not Found response for unhandled event types
      return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }
};
