/**
 * Customization and configuration types for external parties
 */

import type { EntityId } from './dashboard';

/** Permission types for customization control */
export type PermissionType =
  | 'view'
  | 'edit'
  | 'create'
  | 'delete'
  | 'admin'
  | 'customize'
  | 'export';

/** Customization scope levels */
export type CustomizationScope = 'global' | 'dashboard' | 'widget' | 'component';

/** User role interface */
export interface IUserRole {
  /** Role identifier */
  id: string;
  
  /** Role name */
  name: string;
  
  /** Role description */
  description?: string;
  
  /** Permissions for this role */
  permissions: PermissionType[];
  
  /** Customization scope */
  scope: CustomizationScope;
}

/** User profile with customization settings */
export interface IUserProfile {
  /** User identifier */
  id: EntityId;
  
  /** User display name */
  name: string;
  
  /** User email */
  email: string;
  
  /** User roles */
  roles: IUserRole[];
  
  /** User preferences */
  preferences: IUserPreferences;
  
  /** Customization settings */
  customizations: ICustomizationSettings;
  
  /** Organization/tenant ID if multi-tenant */
  tenantId?: string;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** User preferences interface */
export interface IUserPreferences {
  /** Theme preference */
  theme?: 'light' | 'dark' | 'auto';
  
  /** Language/locale */
  locale?: string;
  
  /** Timezone */
  timezone?: string;
  
  /** Default dashboard ID */
  defaultDashboard?: EntityId;
  
  /** Notification preferences */
  notifications?: INotificationPreferences;
  
  /** Custom user preferences */
  custom?: Record<string, unknown>;
}

/** Notification preferences */
export interface INotificationPreferences {
  /** Enable all notifications */
  enabled: boolean;
  
  /** Enable email notifications */
  emailNotifications?: boolean;
  
  /** Enable in-app notifications */
  inAppNotifications?: boolean;
  
  /** Events to notify on */
  eventTypes?: string[];
  
  /** Quiet hours */
  quietHours?: {
    start: string; // HH:mm format
    end: string;
  };
}

/** Customization settings for dashboards and widgets */
export interface ICustomizationSettings {
  /** Customization enabled */
  enabled: boolean;
  
  /** Customizable elements */
  customizableElements: CustomizableElement[];
  
  /** Restricted customizations */
  restrictions?: ICustomizationRestrictions;
  
  /** Widget customization rules */
  widgetCustomization?: IWidgetCustomizationRules;
  
  /** Theme customization allowed */
  allowThemeCustomization?: boolean;
  
  /** Layout customization allowed */
  allowLayoutCustomization?: boolean;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** Customizable UI elements */
export type CustomizableElement =
  | 'title'
  | 'description'
  | 'colors'
  | 'layout'
  | 'widgets'
  | 'data'
  | 'filters'
  | 'exports';

/** Customization restrictions */
export interface ICustomizationRestrictions {
  /** Elements that cannot be customized */
  lockedElements?: CustomizableElement[];
  
  /** Fields that cannot be edited */
  lockedFields?: string[];
  
  /** Allowed color palette */
  allowedColors?: string[];
  
  /** Allowed widget types */
  allowedWidgetTypes?: string[];
  
  /** Maximum number of widgets */
  maxWidgets?: number;
  
  /** Custom restrictions */
  custom?: Record<string, unknown>;
}

/** Widget customization rules */
export interface IWidgetCustomizationRules {
  /** Allow widget additions */
  allowAdd?: boolean;
  
  /** Allow widget removal */
  allowRemove?: boolean;
  
  /** Allow widget repositioning */
  allowReposition?: boolean;
  
  /** Allow widget resizing */
  allowResize?: boolean;
  
  /** Allow configuration changes */
  allowConfigChange?: boolean;
  
  /** Locked widget IDs */
  lockedWidgets?: EntityId[];
  
  /** Widget-specific rules */
  perWidgetRules?: Record<EntityId, IWidgetCustomizationRules>;
}

/** Preset/template configuration */
export interface IDashboardPreset {
  /** Preset identifier */
  id: string;
  
  /** Preset name */
  name: string;
  
  /** Preset description */
  description?: string;
  
  /** Category/group */
  category?: string;
  
  /** Dashboard configuration to apply */
  dashboardConfig: IPresetDashboardConfig;
  
  /** Customization settings in preset */
  customizationSettings?: ICustomizationSettings;
  
  /** Thumbnail/preview URL */
  previewUrl?: string;
  
  /** Version */
  version?: string;
  
  /** Tags for discovery */
  tags?: string[];
}

/** Preset dashboard configuration */
export interface IPresetDashboardConfig {
  /** Layout settings */
  layout: {
    type: 'grid' | 'flex' | 'custom';
    columns?: number;
    gap?: number;
  };
  
  /** Theme settings */
  theme: {
    primaryColor?: string;
    darkMode?: boolean;
  };
  
  /** Widget templates */
  widgets: IPresetWidget[];
  
  /** Default data sources */
  dataSources?: Record<string, unknown>;
}

/** Widget template for presets */
export interface IPresetWidget {
  /** Widget type */
  type: string;
  
  /** Widget position */
  position: {
    x: number;
    y: number;
  };
  
  /** Widget size */
  size: {
    width: number;
    height: number;
  };
  
  /** Widget configuration */
  config: Record<string, unknown>;
  
  /** Data source for widget */
  dataSource?: Record<string, unknown>;
}

/** Export configuration for dashboards */
export interface IExportConfig {
  /** Export format */
  format: 'json' | 'pdf' | 'csv' | 'xlsx' | 'image';
  
  /** Elements to include in export */
  included: ('layout' | 'data' | 'formatting' | 'theme')[];
  
  /** Custom export options */
  options?: Record<string, unknown>;
  
  /** File name for export */
  fileName?: string;
}

/** Integration configuration for external systems */
export interface IIntegrationConfig {
  /** Integration identifier */
  id: string;
  
  /** Integration name */
  name: string;
  
  /** Integration type */
  type: 'webhook' | 'api' | 'plugin' | 'custom';
  
  /** Integration endpoint */
  endpoint?: string;
  
  /** Enable/disable integration */
  enabled: boolean;
  
  /** API key or authentication */
  auth?: Record<string, unknown>;
  
  /** Integration settings */
  settings?: Record<string, unknown>;
  
  /** Events that trigger this integration */
  triggerEvents?: string[];
  
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/** Feature flag configuration */
export interface IFeatureFlag {
  /** Flag identifier */
  id: string;
  
  /** Flag name */
  name: string;
  
  /** Flag enabled */
  enabled: boolean;
  
  /** Feature flag scope */
  scope?: 'global' | 'user' | 'dashboard' | 'organization';
  
  /** Users/dashboards this flag applies to */
  targetIds?: EntityId[];
  
  /** Percentage rollout (0-100) */
  rolloutPercentage?: number;
  
  /** Metadata */
  metadata?: Record<string, unknown>;
}
