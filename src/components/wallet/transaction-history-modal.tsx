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
import { Loader2, ExternalLink } from "lucide-react";
import { Connection, clusterApiUrl, ParsedTransactionWithMeta } from "@solana/web3.js";
import Link from "next/link";
import { Badge } from "../ui/badge";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  signature: string | null;
}

const formatDate = (timestamp?: number | null) => {
  if (timestamp == null) return "N/A";
  return new Date(timestamp * 1000).toLocaleString();
};

export function TransactionHistoryModal({
  isOpen,
  onClose,
  walletAddress,
  signature,
}: TransactionHistoryModalProps) {
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<ParsedTransactionWithMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransaction = async () => {
    if (!signature) return;
    setIsLoading(true);
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      // getParsedTransaction is more detailed than getSignatureStatus
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      setTransaction(tx);
    } catch (error) {
      console.error("Failed to fetch transaction details:", error);
      toast({
        title: "Error",
        description: "Could not fetch transaction details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && signature) {
      fetchTransaction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, signature]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Details for transaction on the Solana network.
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-[200px]">
          {isLoading ? (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-md">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : transaction ? (
            <div className="space-y-4">
              <div className="p-4 border rounded-md text-sm break-all">
                <p className="font-semibold">Signature</p>
                <p className="font-mono text-xs">{signature}</p>
              </div>

              <div className="p-4 border rounded-md text-sm">
                <p className="font-semibold">Status</p>
                <Badge variant={transaction.meta?.err ? "destructive" : "default"}>
                  {transaction.meta?.err ? "Failed" : "Success"}
                </Badge>
              </div>

              <div className="p-4 border rounded-md text-sm">
                <p className="font-semibold">Timestamp</p>
                <p>{formatDate(transaction.blockTime)}</p>
              </div>

              <div className="p-4 border rounded-md text-sm">
                <p className="font-semibold">Fee</p>
                <p>{transaction.meta?.fee ?? 0} lamports</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No transaction selected.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 gap-2">
          {signature && (
            <Button variant="outline" asChild>
              <Link
                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" /> View on Explorer
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
