import { 
  Text, 
  Column, 
  Container, 
  Heading, 
  Html, 
  Img, 
  Row, 
  Section, 
  Tailwind, 
  Head, 
  Preview, 
  Body 
} from "@react-email/components"
import { CustomerDTO, OrderDTO } from "@medusajs/framework/types"

type OrderPlacedEmailProps = {
  order: OrderDTO & {
    customer?: CustomerDTO
  }
  email_banner?: {
    body: string
    title: string
    url: string
  }
}

function OrderPlacedEmailComponent({ order }: OrderPlacedEmailProps) {
  const formatter = new Intl.NumberFormat([], {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: order.currency_code || "eur",
  })

const formatPrice = (price: any): string => {
  if (price == null) return "";

  let num: number | null = null;

  if (typeof price === "number") {
    num = price;
  } else if (typeof price === "string") {
    const parsed = Number(price);
    if (!isNaN(parsed)) num = parsed;
  } else if (typeof price === "object") {
    if ("toNumber" in price && typeof price.toNumber === "function") {
      num = price.toNumber();
    } else if ("numeric_" in price) {
      num = Number(price.numeric_);
    } else if ("value" in price) {
      num = Number(price.value);
    }
  }

  if (num == null) {
    return String(price);
  }

  num = Number(num.toFixed(2));

  const formatted = formatter.format(num);

  return formatted;
};

  return (
    <Tailwind>
      <Html className="font-sans bg-gray-100">
        <Head />
        <Preview>Ďakujeme za Vašu objednávku</Preview>
        <Body className="bg-white my-10 mx-auto w-full max-w-2xl">
          {/* Thank You Message */}
          <Container className="p-6">
            <Heading className="text-2xl font-bold text-center text-gray-800">
              Ďakujeme za Vašu objednávku,{" "}
              {order.customer?.first_name || order.shipping_address?.first_name}
            </Heading>
            <Text className="text-center text-gray-600 mt-2">
              Vaša objednávka sa spracováva a po odoslaní vás budeme informovať.
            </Text>
          </Container>

          {/* Order Items */}
          <Container className="px-6">
            <Heading className="text-xl font-semibold text-gray-800 mb-4">
              Vaše produkty
            </Heading>
            <Row>
              <Column>
                <Text className="text-sm m-0 my-2 text-gray-500">
                  Číslo objednávky: #{order.display_id}
                </Text>
              </Column>
            </Row>
            {order.items?.map((item) => (
              <Section key={item.id} className="border-b border-gray-200 py-4">
                <Row>
                  <Column className="w-1/3">
                    <Img
                      src={item.thumbnail ?? ""}
                      alt={item.product_title ?? ""}
                      className="rounded-lg"
                      width="100%"
                    />
                  </Column>
                  <Column className="w-2/3 pl-4">
                    <Text className="text-lg font-semibold text-gray-800">
                      {item.product_title}
                    </Text>
                    <Text className="text-gray-600">{item.variant_title}</Text>
                    <Text className="text-gray-800 mt-2 font-bold">
                      {formatPrice(item.total)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            ))}

            {/* Order Summary */}
            <Section className="mt-8">
              <Heading className="text-xl font-semibold text-gray-800 mb-4">
                Zhrnutie objednávky
              </Heading>
              <Row className="text-gray-600">
                <Column className="w-1/2">
                  <Text className="m-0">Medzisúčet</Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text className="m-0">{formatPrice(order.subtotal)}</Text>
                </Column>
              </Row>
              {order.shipping_methods?.map((method) => (
                <Row className="text-gray-600" key={method.id}>
                  <Column className="w-1/2">
                    <Text className="m-0">{method.name}</Text>
                  </Column>
                  <Column className="w-1/2 text-right">
                    <Text className="m-0">{formatPrice(method.total)}</Text>
                  </Column>
                </Row>
              ))}
              <Row className="text-gray-600">
                <Column className="w-1/2">
                  <Text className="m-0">DPH</Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text className="m-0">{formatPrice(order.tax_total)}</Text>
                </Column>
              </Row>
              <Row className="border-t border-gray-200 mt-4 text-gray-800 font-bold">
                <Column className="w-1/2">
                  <Text>Spolu</Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text>{formatPrice(order.total)}</Text>
                </Column>
              </Row>
            </Section>
          </Container>

          {/* Footer */}
          <Section className="bg-gray-50 p-6 mt-10">
            <Text className="text-center text-gray-500 text-sm">
              Ak máte akékoľvek otázky, kontaktujte nás na adrese
              jozefsucko@gmail.com
            </Text>
            <Text className="text-center text-gray-500 text-sm">
              Token objednávky: {order.id}
            </Text>
            <Text className="text-center text-gray-400 text-xs mt-4">
              © {new Date().getFullYear()} Zlatníctvo Topas.
            </Text>
          </Section>
        </Body>
      </Html>
    </Tailwind>
  )
}

export const orderPlacedEmail = (props: OrderPlacedEmailProps) => (
  <OrderPlacedEmailComponent {...props} />
)
