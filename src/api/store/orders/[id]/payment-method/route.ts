import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;
  const query = req.scope.resolve("query");

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "payment_collections.payments.provider_id"
    ],
    filters: { id }
  });

  res.json({ data: orders });
};