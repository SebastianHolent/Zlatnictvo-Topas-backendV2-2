import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { generateInvoicePdfWorkflow } from "../workflows/generate-invoice-pdf"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const notificationModuleService = container.resolve("notification")

  // Retrieve order details
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "currency_code",
      "total",
      "email",
      "items.*",
      "items.variant.*",
      "items.variant.product.*",
      "shipping_address.*",
      "billing_address.*",
      "shipping_methods.*",
      "tax_total",
      "subtotal",
      "discount_total",
    ],
    filters: { id: data.id },
  })

  
  // Generate invoice PDF
  const { result: { pdf_buffer } } = await generateInvoicePdfWorkflow(container)
    .run({
      input: { order_id: data.id },
    })
  console.log(`pdf buffer ${[pdf_buffer]}`)
  const buffer = Buffer.from(pdf_buffer)

  console.log("Attachment base64 length:", buffer.toString("base64").length)

  // Send email with PDF attachment
  const payload = {
    to: order.email || "",
    template: "order-placed",
    channel: "email",
    data: { order },
    attachments: [
      {
        filename: `invoice-${order.id}.pdf`,
        content: buffer.toString("base64"),
      },
    ],
  }

  console.log("=== Notification Payload ===")
  console.dir(payload, { depth: null })
  console.log("Attachment base64 length:", payload.attachments[0].content.length)

  await notificationModuleService.createNotifications(payload)
  }

export const config: SubscriberConfig = {
  event: "order.placed",
}