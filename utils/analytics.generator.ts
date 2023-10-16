import { Document, Model, model } from "mongoose";

interface MonthData {
  month: string;
  count: number;
}

export async function generateLast2MonthData<T extends Document>(
  model: Model<T>
): Promise<{ last12Months: MonthData[] }> {
  const last12Months: MonthData[] = [];
  const currentData = new Date();
  currentData.setDate(currentData.getDate() + 1);

  for (let i = 11; i >= 0; i--) {
    const endData = new Date(
      currentData.getFullYear(),
      currentData.getMonth(),
      currentData.getDate() - i * 28
    );
    const stateData = new Date(
      endData.getFullYear(),
      endData.getMonth(),
      endData.getDate() - 28
    );
    const monthYear = endData.toLocaleString("default", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const count = await model.countDocuments({
      createdAt: {
        $gte: stateData,
        $lt: endData,
      },
    });
    last12Months.push({ month: monthYear, count });
  }
  return { last12Months };
}
