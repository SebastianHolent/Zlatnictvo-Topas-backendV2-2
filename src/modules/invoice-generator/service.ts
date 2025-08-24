import { MedusaService } from "@medusajs/framework/utils"
import { InvoiceConfig } from "./models/invoice-config"
import { Invoice } from "./models/invoice"
import PdfPrinter from "pdfmake"
import { 
  InferTypeOf, 
  OrderDTO, 
  OrderLineItemDTO,
} from "@medusajs/framework/types"
import axios from "axios"
import path from "path"

const fonts = {
  Roboto: {
    normal: path.resolve(__dirname, "../../../lib/fonts/Roboto-Regular.ttf"),
    bold: path.resolve(__dirname, "../../../lib/fonts/Roboto-Bold.ttf"),
    italics: path.resolve(__dirname, "../../../lib/fonts/Roboto-Italic.ttf"),
    bolditalics: path.resolve(__dirname, "../../../lib/fonts/Roboto-BoldItalic.ttf"),
  },
}

const printer = new PdfPrinter(fonts)

type GeneratePdfParams = {
  order: OrderDTO
  items: OrderLineItemDTO[]
}

class InvoiceGeneratorService extends MedusaService({
  InvoiceConfig,
  Invoice,
}) {

  private async formatAmount(amount: number, currency: string): Promise<string> {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  private async imageUrlToBase64(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: "arraybuffer" })
    const base64 = Buffer.from(response.data).toString("base64")

    let mimeType = "image/png"
    if (response.headers["content-type"]) {
      mimeType = response.headers["content-type"].split(";")[0]
    }

    return `data:${mimeType};base64,${base64}`
  }

  private async createInvoiceContent(
    params: GeneratePdfParams, 
    invoice: InferTypeOf<typeof Invoice>
  ): Promise<Record<string, any>> {
    const invoiceConfigs = await this.listInvoiceConfigs()
    const config = invoiceConfigs[0] || {}

    const images: Record<string, string> = {}
    if (config.company_logo) {
      images.logoimg = await this.imageUrlToBase64(config.company_logo)
    }

    const itemsTable = [
      [
        { text: "Položka", style: "tableHeader" },
        { text: "Množstvo", style: "tableHeader" },
        { text: "Cena/ks", style: "tableHeader" },
        { text: "Cena celkovo", style: "tableHeader" },
      ],
      ...(await Promise.all(params.items.map(async (item) => [
        { text: item.title || "Unknown Item", style: "tableRow" },
        { text: item.quantity.toString(), style: "tableRow" },
        { text: await this.formatAmount(item.unit_price, params.order.currency_code), style: "tableRow" },
        { text: await this.formatAmount(Number(item.total), params.order.currency_code), style: "tableRow" },
      ]))),
    ]

    const invoiceId = `INV-${invoice.display_id.toString().padStart(6, "0")}`
    const invoiceDate = new Date(invoice.created_at).toLocaleDateString()

    return {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      images,
      header: {
        margin: [40, 20, 40, 0],
        columns: [
          {
            width: "auto",
            stack: [
              {
                text: "Faktúra",
                style: "invoiceTitle",
                alignment: "right",
              },
            ],
          },
        ],
      },
      content: [
        {
          margin: [0, 20, 0, 0],
          columns: [
            {
              width: "*",
              stack: [
                { text: "Zlatníctvo Topas", style: "sectionHeader", margin: [0, 0, 0, 8] },
                config.company_address && { text: config.company_address, style: "companyAddress", margin: [0, 0, 0, 4] },
                config.company_phone && { text: config.company_phone, style: "companyContact", margin: [0, 0, 0, 4] },
                config.company_email && { text: config.company_email, style: "companyContact" },
              ],
            },
            {
              width: "auto",
              table: {
                widths: [80, 120],
                body: [
                  [{ text: "Číslo faktúry:", style: "label" }, { text: invoiceId, style: "value" }],
                  [{ text: "Dátum faktúry:", style: "label" }, { text: invoiceDate, style: "value" }],
                  [{ text: "Číslo objednávky:", style: "label" }, { text: params.order.display_id.toString().padStart(6, "0"), style: "value" }],
                  [{ text: "Dátum objednávky:", style: "label" }, { text: new Date(params.order.created_at).toLocaleDateString(), style: "value" }],
                ],
              },
              layout: "noBorders",
              margin: [0, 0, 0, 20],
            },
          ],
        },
        { text: "\n" },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "Fakturačná adresa", style: "sectionHeader", margin: [0, 0, 0, 8] },
                { text: params.order.billing_address ? 
                  `${params.order.billing_address.first_name || ""} ${params.order.billing_address.last_name || ""}
${params.order.billing_address.address_1 || ""}${params.order.billing_address.address_2 ? `\n${params.order.billing_address.address_2}` : ""}
${params.order.billing_address.city || ""}, ${params.order.billing_address.province || ""} ${params.order.billing_address.postal_code || ""}
${params.order.billing_address.country_code || ""}${params.order.billing_address.phone ? `\n${params.order.billing_address.phone}` : ""}` : 
                  "No billing address provided",
                  style: "addressText",
                },
              ],
            },
            {
              width: "*",
              stack: [
                { text: "Dodacia adresa", style: "sectionHeader", margin: [0, 0, 0, 8] },
                { text: params.order.shipping_address ? 
                  `${params.order.shipping_address.first_name || ""} ${params.order.shipping_address.last_name || ""}
${params.order.shipping_address.address_1 || ""}${params.order.shipping_address.address_2 ? `\n${params.order.shipping_address.address_2}` : ""}
${params.order.shipping_address.city || ""}, ${params.order.shipping_address.province || ""} ${params.order.shipping_address.postal_code || ""}
${params.order.shipping_address.country_code || ""}${params.order.shipping_address.phone ? `\n${params.order.shipping_address.phone}` : ""}` : 
                  "No shipping address provided",
                  style: "addressText",
                },
              ],
            },
          ],
        },
        { text: "\n\n" },
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto"],
            body: itemsTable,
          },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f8f9fa" : null),
            hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0.8 : 0.3),
            vLineWidth: () => 0.3,
            hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length ? "#cbd5e0" : "#e2e8f0"),
            vLineColor: () => "#e2e8f0",
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6,
          },
        },
        { text: "\n" },
        {
          columns: [
            { width: "*", text: "" },
            {
              width: "auto",
              table: {
                widths: ["auto", "auto"],
                body: [
                  [{ text: "Medzisúčet:", style: "totalLabel" }, { text: await this.formatAmount(Number(params.order.subtotal), params.order.currency_code), style: "totalValue" }],
                  [{ text: "DPH:", style: "totalLabel" }, { text: await this.formatAmount(Number(params.order.tax_total), params.order.currency_code), style: "totalValue" }],
                  [{ text: "Doprava:", style: "totalLabel" }, { text: await this.formatAmount(Number(params.order.shipping_methods?.[0]?.total || 0), params.order.currency_code), style: "totalValue" }],
                  [{ text: "Zľava:", style: "totalLabel" }, { text: await this.formatAmount(Number(params.order.discount_total), params.order.currency_code), style: "totalValue" }],
                  [{ text: "Spolu:", style: "totalLabel" }, { text: await this.formatAmount(Number(params.order.total), params.order.currency_code), style: "totalValue" }],
                ],
              },
              layout: {
                fillColor: (rowIndex: number) => (rowIndex === 3 ? "#f8f9fa" : null),
                hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0.8 : 0.3),
                vLineWidth: () => 0.3,
                hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length ? "#cbd5e0" : "#e2e8f0"),
                vLineColor: () => "#e2e8f0",
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 6,
                paddingBottom: () => 6,
              },
            },
          ],
        },
        { text: "\n\n" },
        ...(config.notes ? [
          { text: "Notes", style: "sectionHeader", margin: [0, 20, 0, 10] },
          { text: config.notes, style: "notesText", margin: [0, 0, 0, 20] },
        ] : []),
      ],
      styles: {
        companyName: { font: "Roboto", fontSize: 22, bold: true, color: "#1a365d", margin: [0, 0, 0, 5] },
        companyAddress: { font: "Roboto", fontSize: 11, color: "#4a5568", lineHeight: 1.3 },
        companyContact: { font: "Roboto", fontSize: 10, color: "#4a5568" },
        invoiceTitle: { font: "Roboto", fontSize: 24, bold: true, color: "#2c3e50" },
        label: { font: "Roboto", fontSize: 10, color: "#6c757d", margin: [0, 0, 8, 0] },
        value: { font: "Roboto", fontSize: 10, bold: true, color: "#2c3e50" },
        sectionHeader: { font: "Roboto", fontSize: 12, bold: true, color: "#2c3e50", backgroundColor: "#f8f9fa", padding: [8, 12] },
        addressText: { font: "Roboto", fontSize: 10, color: "#495057", lineHeight: 1.3 },
        tableHeader: { font: "Roboto", fontSize: 10, bold: true, color: "#ffffff", fillColor: "#495057" },
        tableRow: { font: "Roboto", fontSize: 9, color: "#495057" },
        totalLabel: { font: "Roboto", fontSize: 10, bold: true, color: "#495057" },
        totalValue: { font: "Roboto", fontSize: 10, bold: true, color: "#2c3e50" },
        notesText: { font: "Roboto", fontSize: 10, color: "#6c757d", italics: true, lineHeight: 1.4 },
        thankYouText: { font: "Roboto", fontSize: 12, color: "#28a745", italics: true },
      },
      defaultStyle: { font: "Roboto" },
    }
  }

  async generatePdf(params: GeneratePdfParams & { invoice_id: string }): Promise<Buffer> {
    const invoice = await this.retrieveInvoice(params.invoice_id)

    let pdfContent = invoice.pdfContent
    const needsRegen = 
      !pdfContent || 
      !Object.keys(pdfContent).length || 
      JSON.stringify(pdfContent).includes("Helvetica")

    if (needsRegen) {
      pdfContent = await this.createInvoiceContent(params, invoice)

      await this.updateInvoices({
        id: invoice.id,
        pdfContent,
      })
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const pdfDoc = printer.createPdfKitDocument(pdfContent as any)

      pdfDoc.on("data", (chunk) => chunks.push(chunk))
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
      pdfDoc.on("error", (err) => reject(err))

      pdfDoc.end()
    })
  }
}

export default InvoiceGeneratorService
