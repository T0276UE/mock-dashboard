/**
 * Core dashboard types and interfaces
 */

import type { Widget } from './widget';
import type { DashboardEvent } from './events';

/** Unique identifier type for dashboard entities */
export type EntityId = string & { readonly __brand: 'EntityId' };

export function createEntityId(id: string): EntityId {
  return id as EntityId;
}

/** Represents the overall dashboard configuration and state */
export interface IDashboard {
  id: EntityId;
  name: string;  
  description?: string;
  widgets: Widget[];
  /** Dashboard layout configuration */
  layout: IDashboardLayout;  
  theme: IDashboardTheme;
  
  /** Metadata and custom properties for external parties */
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Dashboard layout configuration */
export interface IDashboardLayout {
  /** Layout type (grid, flex, custom) */
  type: 'grid' | 'flex' | 'custom';  
  columns?: number;
  rowHeight?: number;
  gap?: number; /** widget gap**/
  
  customProps?: Record<string, unknown>;
}

/** Theme configuration for dashboard styling */
export interface IDashboardTheme {
  /** Primary color */
  primaryColor?: string;
  
  /** Secondary color */
  secondaryColor?: string;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Text color */
  textColor?: string;
  
  /** Font family */
  fontFamily?: string;
  
  /** Custom theme variables */
  customVariables?: Record<string, string>;
  
  /** Dark mode enabled */
  darkMode?: boolean;
}

/** Dashboard event subscription and emission options */
export interface IDashboardEventConfig {
  /** Enable event broadcasting for all dashboard changes */
  enableEventBroadcasting: boolean;
  
  /** List of event types to emit */
  emitEventTypes: DashboardEvent['type'][];
  
  /** Debounce delay for high-frequency events (ms) */
  eventDebounceDelay?: number;
  
  /** Maximum event history to keep in memory */
  maxEventHistory?: number;
}

/** Response from dashboard operations */
export interface IDashboardResponse<T = unknown> {
  /** Indicates success or failure */
  success: boolean;
  
  /** Response data payload */
  data?: T;
  
  /** Error message if operation failed */
  error?: string;
  
  /** Error code for programmatic handling */
  errorCode?: string;
  
  /** Metadata about the response */
  metadata?: {
    timestamp: Date;
    requestId?: string;
  };
}
