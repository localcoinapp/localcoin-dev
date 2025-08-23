
'use client';

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
    onCancel?: () => void;
    onRedeem?: () => void;
    isRedeemDialogOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    'pending_approval': { label: "Pending", color: "bg-yellow-500" },
    'approved': { label: "Approved", color: "bg-green-500" },
    'ready_to_redeem': { label: "Ready to Redeem", color: "bg-blue-500" },
    'rejected': { label: "Denied", color: "bg-red-500" },
    'completed': { label: "Redeemed", color: "bg-purple-500" },
    'cancelled': { label: "Canceled", color: "bg-gray-500" },
};

export function CartItemCard({ cartItem, onCancel, onRedeem, isRedeemDialogOpen, onOpenChange }: CartItemCardProps) {
    const config = statusConfig[cartItem.status];
    
    const getRelativeDate = (timestamp: any) => {
      if (!timestamp) return 'some time ago';
      // Check if it's a Firestore Timestamp
      if (typeof timestamp.toDate === 'function') {
        return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
      }
      // Otherwise, assume it's already a JS Date or a string that can be parsed
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    const requestedAt = getRelativeDate(cartItem.timestamp);

    return (
        <Card className={cn("overflow-hidden", cartItem.status === 'rejected' && 'bg-muted/50')}>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                        {config && <Badge variant="secondary" className={cn(config.color, "text-white")}>{config.label}</Badge>}
                        <p className="text-muted-foreground text-sm">from {cartItem.merchantName}</p>
                    </div>
                    <h3 className="font-bold text-lg">{cartItem.title}</h3>
                    <p className="text-muted-foreground text-sm">Requested {requestedAt}</p>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-bold text-xl">
                       {cartItem.price.toFixed(2)} {siteConfig.token.symbol}
                    </p>
                    
                    {(cartItem.status === 'approved' || cartItem.status === 'ready_to_redeem') && onRedeem && onOpenChange && (
                        <RedeemDialog 
                            isOpen={isRedeemDialogOpen ?? false}
                            onOpenChange={onOpenChange}
                            cartItem={cartItem} 
                            onRedeem={onRedeem}
                        >
                            <Button size="sm">
                                <QrCode className="mr-2 h-4 w-4" />
                                Redeem
                            </Button>
                        </RedeemDialog>
                    )}
                     {cartItem.status === 'pending_approval' && onCancel && (
                        <Button variant="outline" size="sm" onClick={onCancel}>Cancel Request</Button>
                     )}
                     {(cartItem.status === 'rejected' || cartItem.status === 'cancelled') && (
                        <Button variant="outline" size="sm" disabled>
                            {cartItem.status === 'rejected' ? 'Request Denied' : 'Request Cancelled'}
                        </Button>
                     )}
                      {cartItem.status === 'completed' && (
                        <Button variant="outline" size="sm" disabled>Redeemed</Button>
                     )}
                </div>
            </CardContent>
        </Card>
    );
}
