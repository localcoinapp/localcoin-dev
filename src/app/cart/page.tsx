
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { merchants } from "@/data/merchants"
import type { CartItem, MerchantItem } from "@/types"
import { CartItemCard } from "@/components/cart/cart-item"

const kaffeeKlatsch = merchants.find(m => m.id === '1')!;
const coworking = merchants.find(m => m.id === '3')!;
const restaurant = merchants.find(m => m.id === '4')!;

const cartItems: CartItem[] = [
  {
    id: 'cart1',
    item: kaffeeKlatsch.items.find(i => i.id === 'i2') as MerchantItem,
    merchantId: kaffeeKlatsch.id,
    merchantName: kaffeeKlatsch.name,
    status: 'pending',
    requestedAt: '2024-07-30T10:00:00Z',
  },
  {
    id: 'cart2',
    item: coworking.items.find(i => i.id === 'i7') as MerchantItem,
    merchantId: coworking.id,
    merchantName: coworking.name,
    status: 'approved',
    requestedAt: '2024-07-29T15:30:00Z',
    confirmationCode: 'CWRK-8432'
  },
  {
    id: 'cart3',
    item: restaurant.items.find(i => i.id === 'i10') as MerchantItem,
    merchantId: restaurant.id,
    merchantName: restaurant.name,
    status: 'approved',
    requestedAt: '2024-07-29T12:00:00Z',
    confirmationCode: 'REST-5467'
  },
  {
    id: 'cart4',
    item: restaurant.items.find(i => i.id === 'i11') as MerchantItem,
    merchantId: restaurant.id,
    merchantName: restaurant.name,
    status: 'denied',
    requestedAt: '2024-07-28T19:00:00Z',
  },
  {
    id: 'cart5',
    item: kaffeeKlatsch.items.find(i => i.id === 'i3') as MerchantItem,
    merchantId: kaffeeKlatsch.id,
    merchantName: kaffeeKlatsch.name,
    status: 'redeemed',
    requestedAt: '2024-07-27T14:20:00Z',
  },
  {
    id: 'cart6',
    item: coworking.items.find(i => i.id === 'i8') as MerchantItem,
    merchantId: coworking.id,
    merchantName: coworking.name,
    status: 'canceled',
    requestedAt: '2024-07-26T11:00:00Z',
  }
];

export default function CartPage() {
  const pending = cartItems.filter(item => item.status === 'pending');
  const approved = cartItems.filter(item => item.status === 'approved');
  const history = cartItems.filter(item => ['redeemed', 'denied', 'canceled'].includes(item.status));

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-left mb-8">
        <h1 className="text-4xl font-headline font-bold">My Cart</h1>
        <p className="text-muted-foreground mt-2">
          Manage your requests and redeem approved items.
        </p>
      </div>

      <Tabs defaultValue="approved" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="approved">Ready to Redeem</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Ready to Redeem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {approved.length > 0 ? (
                approved.map(item => <CartItemCard key={item.id} cartItem={item} />)
              ) : (
                <p className="text-muted-foreground text-center py-8">No approved items to redeem.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Merchant Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {pending.length > 0 ? (
                pending.map(item => <CartItemCard key={item.id} cartItem={item} />)
              ) : (
                <p className="text-muted-foreground text-center py-8">You have no pending requests.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {history.length > 0 ? (
                 history.map(item => <CartItemCard key={item.id} cartItem={item} />)
              ) : (
                 <p className="text-muted-foreground text-center py-8">Your order history is empty.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
