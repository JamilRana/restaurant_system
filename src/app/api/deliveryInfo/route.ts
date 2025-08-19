import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postcode = searchParams.get("postcode");

  if (!postcode) {
    return new Response(JSON.stringify({ error: "Postcode is required" }), {
      status: 400,
    });
  }

  try {
    // Query the database to find the matching delivery zone
    const deliveryZone = await prisma.deliveryZone.findFirst({
      where: {
        postcode: postcode, // Match the postcode entered
      },
    });

    if (!deliveryZone) {
      return new Response(
        JSON.stringify({ error: "Delivery zone not found for this postcode" }),
        { status: 404 }
      );
    }

    // Return the delivery fee and available time slots
    return new Response(
      JSON.stringify({
        deliveryFee: deliveryZone.deliveryFee,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
    });
  }
}
