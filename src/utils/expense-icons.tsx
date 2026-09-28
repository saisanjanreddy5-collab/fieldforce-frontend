import type { ReactNode } from "react";
import { CarOutlined, CustomerServiceOutlined, FileTextOutlined, FireOutlined, HomeOutlined, PhoneOutlined, WalletOutlined } from "@ant-design/icons";
import type { ExpenseTypeKey } from "../types/expense";

export const EXPENSE_TYPE_ICON: Record<ExpenseTypeKey, ReactNode> = {
  travel: <CarOutlined />,
  fuel: <FireOutlined />,
  lodging: <HomeOutlined />,
  meals: <CustomerServiceOutlined />,
  client_entertainment: <WalletOutlined />,
  telecom: <PhoneOutlined />,
  marketing_collateral: <FileTextOutlined />,
};
