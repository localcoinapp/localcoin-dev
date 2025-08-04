
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
    pending: {
        icon: Clock,
        label: "Pending Approval",
        color: "bg-yellow-500",
        text: "text-yellow-500",
    },
    approved: {
        icon: CheckCircle,
        label: "Approved",
        color: "bg-green-500",
        text: "text-green-500",
    },
    denied: {
        icon: XCircle,
        label: "Denied",
        color: "bg-red-500",
        text: "text-red-500",
    },
    redeemed: {
        icon: Star,
        label: "Redeemed",
        color: "bg-blue-500",
        text: "text-blue-500",
    },
    canceled: {
        icon: Undo2,
        label: "Canceled",
        color: "bg-gray-500",
        text: "text-gray-500",
    }
}

export function CartItemCard({ cartItem }: CartItemCardProps) {
    const config = statusConfig[cartItem.status];

    return (
        <Card className={cn("overflow-hidden", cartItem.status === 'denied' && 'bg-muted/50')}>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={cn(config.color, "text-white")}>{config.label}</Badge>
                        <p className="text-sm text-muted-foreground">from {cartItem.merchantName}</p>
                    </div>
                    <h3 className="font-bold text-lg">{cartItem.item.name}</h3>
                    <p className="text-muted-foreground text-sm">
                        Requested {formatDistanceToNow(new Date(cartItem.requestedAt), { addSuffix: true })}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <p className="font-bold text-xl">
                       {cartItem.item.price.toFixed(2)} {siteConfig.token.symbol}
                    </p>
                    {cartItem.status === 'approved' && (
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
                     {cartItem.status === 'pending' && (
                         <Button variant="outline" size="sm">Cancel Request</Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
