import React from 'react';
import { Notification, NotificationType } from '../types';
import { AlertCircle, GraduationCap, Info, AlertTriangle, Calendar } from 'lucide-react';

interface NotificationCardProps {
  notification: Notification;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({ notification }) => {
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.MEDICAL:
        return <AlertTriangle className="text-red-500" size={24} />;
      case NotificationType.TRAINING:
        return <GraduationCap className="text-blue-500" size={24} />;
      case NotificationType.URGENT:
        return <AlertCircle className="text-orange-500" size={24} />;
      case NotificationType.INFO:
      default:
        return <Info className="text-gray-500" size={24} />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case NotificationType.MEDICAL: return 'border-l-red-500';
      case NotificationType.TRAINING: return 'border-l-blue-500';
      case NotificationType.URGENT: return 'border-l-orange-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className={`bg-white p-5 rounded-lg shadow-sm border border-gray-100 border-l-4 ${getBorderColor()} flex gap-4 animate-fade-in-up`}>
      <div className="mt-1 flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-800 text-lg">{notification.title}</h3>
          {notification.dueDate && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
              <Calendar size={12} />
              Do: {notification.dueDate}
            </span>
          )}
        </div>
        <p className="text-gray-600 mt-1">{notification.description}</p>
        <p className="text-xs text-gray-400 mt-3 text-right">
          Utworzono: {new Date(notification.createdAt).toLocaleDateString('pl-PL')}
        </p>
      </div>
    </div>
  );
};