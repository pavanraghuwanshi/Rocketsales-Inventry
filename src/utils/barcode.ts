// utils/barcode.ts
import  Counter  from "../modules/product/counter.model";



export const getBulkBarcodes = async (count: number): Promise<string[]> => {
  if (count <= 0) throw new Error("Invalid count");

  // 🔥 increment once by count
  const counter = await Counter.findOneAndUpdate(
    { name: "barcode" },
    { $inc: { sequence: count } },
     {
    returnDocument: "after", // ✅ correct
    upsert: true,
  }
  );

  if (!counter) {
    throw new Error("Barcode generation failed");
  }

  const base = 100000000000000;

  // 👇 generate sequence range
  const start = counter.sequence - count + 1;

  const barcodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const barcode = base + (start + i);
    barcodes.push(barcode.toString());
  }

  return barcodes;
};