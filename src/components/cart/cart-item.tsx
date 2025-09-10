
'use client';

import { formatDistanceToNow } from 'date-fns';
import type { CartItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { QrCode } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { RedeemDialog } from './redeem-dialog';

interface CartItemCardProps {
    cartItem: CartItem;
    onCancel?: () => void;
    onAction?: () => void; // Generic action handler
    actionLabel?: string;
    isRedeemMode?: boolean;
    isRedeemDialogOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    'pending_approval': { label: "Pending", color: "bg-yellow-500" },
    'approved': { label: "Approved", color: "bg-blue-500" },
    'ready_to_redeem': { label: "Ready to Redeem", color: "bg-green-500" },
    'rejected': { label: "Denied", color: "bg-red-500" },
    'completed': { label: "Redeemed", color: "bg-purple-500" },
    'cancelled': { label: "Canceled", color: "bg-gray-500" },
};

export function CartItemCard({ cartItem, onCancel, onAction, actionLabel, isRedeemMode, isRedeemDialogOpen, onOpenChange }: CartItemCardProps) {
    const config = statusConfig[cartItem.status];
    
    const getRelativeDate = (timestamp: any) => {
      if (!timestamp) return 'some time ago';
      if (typeof timestamp.toDate === 'function') {
        return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
      }
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    const requestedAt = getRelativeDate(cartItem.timestamp);

    const renderAction = () => {
        if (isRedeemMode && onAction && onOpenChange) {
            return (
                 <RedeemDialog 
                    isOpen={isRedeemDialogOpen ?? false}
                    onOpenChange={onOpenChange}
                    cartItem={cartItem} 
                 >
                    <Button size="sm">
                        <QrCode className="mr-2 h-4 w-4" />
                        Redeem
                    </Button>
                </RedeemDialog>
            );
        }

        if (onAction && actionLabel) {
            return <Button size="sm" onClick={onAction}>{actionLabel}</Button>
        }
        
        if (cartItem.status === 'pending_approval' && onCancel) {
            return <Button variant="outline" size="sm" onClick={onCancel}>Cancel Request</Button>;
        }

        if (['rejected', 'cancelled', 'completed'].includes(cartItem.status)) {
            return <Button variant="outline" size="sm" disabled>{config?.label || cartItem.status}</Button>;
        }

        return null;
    }

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
                    {renderAction()}
                </div>
            </CardContent>
        </Card>
    );
}
