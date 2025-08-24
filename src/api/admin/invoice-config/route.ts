import { z } from "zod"
import { 
  updateInvoiceConfigWorkflow,
} from "../../../workflows/update-invoice-config"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET handler: retrieves the current invoice configuration
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const { data: [invoiceConfig] } = await query.graph({
    entity: "invoice_config",
    fields: ["*"],
  })

  res.json({
    invoice_config: invoiceConfig,
  })
}

// POST handler: updates the invoice configuration
export const PostInvoiceConfigSchema = z.object({
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().optional(),
  company_logo: z.string().optional(),
  notes: z.string().optional(),
})

type PostInvoiceConfig = z.infer<typeof PostInvoiceConfigSchema>

export async function POST(
  req: MedusaRequest<PostInvoiceConfig>,
  res: MedusaResponse
) {
  const { result: { invoice_config } } = await updateInvoiceConfigWorkflow(
    req.scope
  ).run({
    input: req.validatedBody,
  })

  res.json({
    invoice_config,
  })
}