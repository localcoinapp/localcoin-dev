
import { collection, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { merchants } from "@/data/merchants";

export const seedDatabase = async () => {
    const merchantsCollection = collection(db, "merchants");
    const batch = writeBatch(db);

    merchants.forEach((merchant) => {
        // In a real app, you might want to use merchant.id as the document ID
        // but for simplicity here we let Firestore auto-generate IDs.
        // Or better, use `doc(merchantsCollection, merchant.id)` to set a specific ID.
        const { id, ...merchantData } = merchant;
        const docRef = collection(db, "merchants", id);
        batch.set(docRef, merchantData);
    });

    try {
        await batch.commit();
        console.log("Database seeded successfully!");
    } catch (error) {
        console.error("Error seeding database: ", error);
        throw error;
    }
};
