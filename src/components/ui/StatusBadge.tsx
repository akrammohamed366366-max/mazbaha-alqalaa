import React from 'react';
import { OrderStatus } from '../../types';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Bike,
  Check,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const configs: Record<
    OrderStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    pending_payment: {
      label: 'بانتظار الدفع',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    new: {
      label: 'طلب جديد',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    accepted: {
      label: 'تم القبول',
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
      icon: <Check className="w-3.5 h-3.5" />,
    },
    preparing: {
      label: 'على الشواية',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: <ChefHat className="w-3.5 h-3.5" />,
    },
    ready: {
      label: 'جاهز للتسليم',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <PackageCheck className="w-3.5 h-3.5" />,
    },
    out_for_delivery: {
      label: 'مع المندوب',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <Bike className="w-3.5 h-3.5" />,
    },
    delivered: {
      label: 'تم التسليم',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    cancelled: {
      label: 'طلب ملغي',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const config = configs[status] || {
    label: status,
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  };

  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-lg border ${config.bg} ${config.text} ${config.border} ${sizeCls}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
