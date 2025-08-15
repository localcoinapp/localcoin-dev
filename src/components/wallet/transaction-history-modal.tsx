
'use client';

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Connection, PublicKey, clusterApiUrl, ConfirmedSignatureInfo } from "@solana/web3.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Badge } from "../ui/badge";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
};


export function TransactionHistoryModal({ isOpen, onClose, walletAddress }: TransactionHistoryModalProps) {
    const { toast } = useToast();
    const [signatures, setSignatures] = useState<ConfirmedSignatureInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchHistory = async () => {
        if (!walletAddress) return;
        setIsLoading(true);
        try {
            const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
            const publicKey = new PublicKey(walletAddress);
            const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 25 });
            setSignatures(sigs);
        } catch (error) {
            console.error("Failed to fetch transaction history:", error);
            toast({
                title: "Error",
                description: "Could not fetch transaction history.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, walletAddress]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Transaction History</DialogTitle>
                    <DialogDescription>
                        Recent transactions for wallet: <span className="font-mono text-xs">{walletAddress}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}
                    <ScrollArea className="h-[60vh] border rounded-md">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    <TableHead>Signature</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Explorer</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {signatures.length > 0 ? (
                                    signatures.map((sig) => (
                                        <TableRow key={sig.signature}>
                                            <TableCell className="font-mono text-xs">{sig.signature.slice(0, 10)}...</TableCell>
                                            <TableCell>{formatDate(sig.blockTime)}</TableCell>
                                            <TableCell>
                                                <Badge variant={sig.err ? 'destructive' : 'default'}>
                                                    {sig.err ? 'Failed' : 'Success'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`https://explorer.solana.com/tx/${sig.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No transaction history found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <div className="flex justify-end mt-4">
                        <Button variant="outline" onClick={fetchHistory} disabled={isLoading}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
