/**
 * Shared Type Definitions for Smart Laundromat Operations
 */

export type MachineStatus = 'available' | 'running' | 'completed' | 'malfunctioning' | 'maintenance';
export type MachineType = 'washer' | 'dryer';

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  status: MachineStatus;
  cycleType: string | null;
  remainingMinutes: number;
  totalCycleTime: number;
  revenueRate: number;
  currentUserId: string | null;
  currentUserName: string | null;
  lastMaintenanceDate: string;
  maintenanceNotes: string;
  malfunctionReason: string | null;
  usageCount: number;
  efficiencyFactor: number;
  // Optional dynamic pricing fields enriched at runtime
  dynamicPrice?: number;
  priceReasons?: string[];
  priceMultiplier?: number;
}

export interface Booking {
  id: string;
  machineId: string;
  userId: string;
  userName: string;
  scheduledTime: string; // ISO string or time slot
  status: 'pending' | 'completed' | 'cancelled';
  amountPaid: number;
}

export interface LoyaltyProfile {
  id: string;
  name: string;
  email: string;
  points: number;
  totalVisits: number;
  balance: number; // Prepaid wallet
  discountTier: 'Bronze' | 'Silver' | 'Gold' | 'VIP';
  discountRate: number; // Decimal (e.g., 0.05, 0.10)
  segment?: 'frequent weekday users' | 'weekend warriors' | 'high spenders' | 'new eco-savers';
  avgSpend?: number;
  personalizedOffer?: {
    title: string;
    description: string;
    discountBonusCode: string;
    extraDiscountRate: number;
  };
}

export interface Transaction {
  id: string;
  timestamp: string;
  machineId: string | null;
  machineName: string | null;
  userId: string | null;
  userName: string;
  amount: number;
  discount: number;
  paymentMethod: string;
  type: 'wash_dry' | 'wallet_topup';
}

export interface MaintenanceTask {
  id: string;
  machineId: string;
  machineName: string;
  assignedTechnician: string;
  taskDescription: string;
  scheduledDate: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export interface SystemNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'malfunction' | 'cycle_complete' | 'payment_success' | 'maintenance_scheduled' | 'service_request';
  read: boolean;
  machineId?: string;
}

export interface LaundromatState {
  machines: Machine[];
  bookings: Booking[];
  loyaltyProfiles: LoyaltyProfile[];
  transactions: Transaction[];
  maintenanceTasks: MaintenanceTask[];
  notifications: SystemNotification[];
  pricingRules?: {
    peakMultiplier: number;
    offPeakDiscountRate: number;
    simulatedHour: number;
    simulatedDay: string;
  };
  aiWorkflowOrchestration: {
    lastWorkflowRun: string;
    nextAutomatedCheck: string;
    activeRules: string[];
    log: string[];
  };
}
