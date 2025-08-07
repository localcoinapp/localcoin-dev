
'use client'

import { formatDistanceToNow } from 'date-fns';
import type { CartItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle, XCircle, Undo2, Star, QrCode } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { RedeemDialog } from './redeem-dialog';

interface CartItemCardProps {
    cartItem: CartItem;
}

const statusConfig = {
    'pending_approval': { // Changed key
        icon: Clock,
        label: "Pending Approval",
        color: "bg-yellow-500",
        text: "text-yellow-500",
    },
    'ready_to_redeem': { // Changed key
        icon: CheckCircle,
        label: "Approved", // You might want to change this label to "Ready to Redeem"
        color: "bg-green-500",
        text: "text-green-500",
    },
    'rejected': { // Changed key
        icon: XCircle,
        label: "Denied", // You might want to change this label to "Rejected"
        color: "bg-red-500",
        text: "text-red-500",
    },
    'completed': { // Changed key
        icon: Star,
        label: "Redeemed", // You might want to change this label to "Completed"
        color: "bg-blue-500",
        text: "text-blue-500",
    },
    'cancelled': { // Changed key
        icon: Undo2,
        label: "Canceled", // You might want to change this label to "Cancelled"
        color: "bg-gray-500",
        text: "text-gray-500",
    }
    // You might also want to add 'completed' if it's a distinct status
}

export function CartItemCard({ cartItem }: CartItemCardProps) {
    const config = statusConfig[cartItem.status];

    return (
        <Card className={cn("overflow-hidden", cartItem.status === 'rejected' && 'bg-muted/50')}> {/* Adjusted denied to rejected */}
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={cn(config?.color, "text-white")}>{config?.label}</Badge> {/* Added optional chaining */}
                        <p className="text-sm text-muted-foreground">from {cartItem.merchantName}</p>
                    </div>
                    <h3 className="font-bold text-lg">{cartItem.title}</h3> {/* Changed to cartItem.title */}
                    {/* You might need to adjust the requestedAt field name if it's different in your Order interface */}
                    {/* <p className="text-muted-foreground text-sm">
                        Requested {formatDistanceToNow(new Date(cartItem.requestedAt), { addSuffix: true })}
                    </p> */}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <p className="font-bold text-xl">
                       {cartItem.price.toFixed(2)} {siteConfig.token.symbol} {/* Changed to cartItem.price */}
                    </p>
                    {cartItem.status === 'ready_to_redeem' && ( // Adjusted status check
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">Cancel</Button>
                            <RedeemDialog cartItem={cartItem}>
                                <Button size="sm">
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Redeem
                                </Button>
                            </RedeemDialog>
                        </div>
                    )}
                     {cartItem.status === 'pending_approval' && ( // Adjusted status check
                         <Button variant="outline" size="sm">Cancel Request</Button>
                    )}
                     {/* Add buttons for other statuses if needed */}
                     {(cartItem.status === 'rejected' || cartItem.status === 'cancelled') && (
                        <Button variant="outline" size="sm" disabled>
                            {cartItem.status === 'rejected' ? 'Request Denied' : 'Request Cancelled'}
                        </Button>
                     )}
                      {cartItem.status === 'completed' && (
                        <Button variant="outline" size="sm" disabled>
                           Redeemed
                        </Button>
                     )}
                </div>
            </CardContent>
        </Card>
    )
}

