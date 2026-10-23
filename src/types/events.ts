/**
 * Event types and interfaces for event-driven architecture
 */

import  type { EntityId } from './dashboard';
import type { IWidgetMutation } from './widget';

/** Dashboard event types */
export type DashboardEventType =
  | 'dashboard:created'
  | 'dashboard:updated'
  | 'dashboard:deleted'
  | 'dashboard:activated'
  | 'dashboard:deactivated'
  | 'widget:added'
  | 'widget:updated'
  | 'widget:removed'
  | 'widget:moved'
  | 'widget:resized'
  | 'data:refreshed'
  | 'data:error'
  | 'user:interaction'
  | 'custom:event';

/** Base dashboard event interface */
export interface DashboardEvent<T = unknown> {
  /** Event type identifier */
  type: DashboardEventType;
  
  /** Unique event identifier */
  id: string;
  
  /** ID of the dashboard instance */
  dashboardId: EntityId;
  
  /** Timestamp when event occurred */
  timestamp: Date;
  
  /** Event payload data */
  payload: T;
  
  /** Source of the event (internal/external) */
  source: 'internal' | 'external' | 'api';
  
  /** User or system that triggered the event (optional) */
  actor?: string;
  
  /** Priority level */
  priority: 'low' | 'normal' | 'high' | 'critical';
  
  /** Metadata for tracking and debugging */
  metadata?: {
    requestId?: string;
    correlationId?: string;
    tags?: string[];
    customData?: Record<string, unknown>;
  };
}

/** Dashboard lifecycle events */
export interface IDashboardLifecycleEvent extends DashboardEvent {
  type: 'dashboard:created' | 'dashboard:updated' | 'dashboard:deleted' | 'dashboard:activated' | 'dashboard:deactivated';
  payload: {
    dashboardId: EntityId;
    dashboardName?: string;
    changes?: Record<string, unknown>;
  };
}

/** Widget-related events */
export interface IWidgetEvent extends DashboardEvent {
  type: 'widget:added' | 'widget:updated' | 'widget:removed' | 'widget:moved' | 'widget:resized';
  payload: IWidgetMutation | {
    widgetId: EntityId;
    widgetType?: string;
    changes?: Record<string, unknown>;
  };
}

/** Data refresh events */
export interface IDataEvent extends DashboardEvent {
  type: 'data:refreshed' | 'data:error';
  payload: {
    widgetId?: EntityId;
    dataSourceId?: string;
    data?: unknown;
    error?: {
      message: string;
      code?: string;
      details?: unknown;
    };
    duration?: number; // milliseconds
  };
}

/** User interaction events */
export interface IUserInteractionEvent extends DashboardEvent {
  type: 'user:interaction';
  payload: {
    interactionType: 'click' | 'hover' | 'scroll' | 'filter' | 'sort' | 'custom';
    targetId?: EntityId;
    targetType?: string;
    details?: Record<string, unknown>;
  };
}

/** Custom event interface for extensibility */
export interface ICustomEvent extends DashboardEvent {
  type: 'custom:event';
  payload: Record<string, unknown>;
}

/** Event listener callback type */
export type EventListener<T extends DashboardEvent = DashboardEvent> = (event: T) => void | Promise<void>;

/** Event listener options */
export interface IEventListenerOptions {
  /** Only listen once */
  once?: boolean;
  
  /** Priority of listener execution */
  priority?: number;
  
  /** Async execution */
  async?: boolean;
  
  /** Filter function to determine if listener should trigger */
  filter?: (event: DashboardEvent) => boolean;
}

/** Event bus configuration */
export interface IEventBusConfig {
  /** Enable event logging */
  enableLogging: boolean;
  
  /** Maximum number of events to keep in history */
  maxHistorySize: number;
  
  /** Enable event deduplication */
  enableDeduplication: boolean;
  
  /** Deduplication timeout (ms) */
  deduplicationTimeout?: number;
  
  /** Enable async event processing */
  asyncEventProcessing: boolean;
  
  /** Event batch size for async processing */
  asyncBatchSize?: number;
}

/** Event filter criteria */
export interface IEventFilterCriteria {
  /** Filter by event type(s) */
  eventTypes?: DashboardEventType[];
  
  /** Filter by dashboard ID(s) */
  dashboardIds?: EntityId[];
  
  /** Filter by source */
  source?: 'internal' | 'external' | 'api';
  
  /** Filter by priority */
  priority?: ('low' | 'normal' | 'high' | 'critical')[];
  
  /** Filter by time range */
  timeRange?: {
    startTime: Date;
    endTime: Date;
  };
  
  /** Custom filter function */
  customFilter?: (event: DashboardEvent) => boolean;
}

/** Event response from API endpoints */
export interface IEventResponse {
  /** Indicates if event was processed successfully */
  success: boolean;
  
  /** Event ID if successfully processed */
  eventId?: string;
  
  /** Error message if failed */
  error?: string;
  
  /** Timestamp of processing */
  timestamp: Date;
  
  /** Custom response data */
  data?: Record<string, unknown>;
}
