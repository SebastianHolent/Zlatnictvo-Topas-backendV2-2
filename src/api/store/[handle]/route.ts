import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QueryContext, getVariantAvailability } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { handle } = req.params
  const query = req.scope.resolve("query")
  const currency_code = "eur" // Make sure to set this to your desired currency

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "*",
      "variants.*",
      "variants.calculated_price.*",
      "images.*",
      "categories.*",
      "collection.title*",
      "options.values.*",
      "options.*",
      "variants.options.*",
      "variants.inventory_items.*",
      "variants.manage_inventory",
      "sales_channels.*"
    ],
    filters: { handle },
    context: {
      variants: {
        calculated_price: QueryContext({
          currency_code,
        }),
      },
    },
  })

  const product = products[0]
  if (!product) {
    return res.status(404).json({ message: "Product not found" })
  }

  const sales_channel_id = product.sales_channels?.[0]?.id
  if (!sales_channel_id) {
    return res.status(400).json({ message: "No sales channel found for product" })
  }

  const variant_ids = product.variants?.map(v => v.id) || []

  const availability = await getVariantAvailability(query, {
    variant_ids,
    sales_channel_id,
  })
  
  product.variants = product.variants.map(variant => ({
    ...variant,
    inventory_quantity: availability[variant.id]?.availability ?? null,
  }))

  res.json({ product })
}